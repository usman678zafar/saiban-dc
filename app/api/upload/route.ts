import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadToR2, deleteFromR2, generateFileKey } from '@/lib/r2';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { detectAllowedFileType, isAllowedDocumentType, MAX_UPLOAD_SIZE, uploadTypeLabel } from '@/lib/upload-policy';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  const uploadLimit = rateLimit(request, 'upload', 30, 10 * 60 * 1000);
  if (!uploadLimit.allowed) {
    return NextResponse.json(
      { message: `Too many uploads. Please try again in ${uploadLimit.retryAfter} seconds.` },
      { status: 429 },
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const applicationId = formData.get('applicationId') as string;

    if (!file || !documentType || !applicationId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    if (!isAllowedDocumentType(documentType)) {
      return NextResponse.json({ message: 'Invalid document type' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ message: 'File too large. Maximum size is 4MB.' }, { status: 400 });
    }

    if (!await detectAllowedFileType(file)) {
      return NextResponse.json({ message: `Invalid file type. Upload ${uploadTypeLabel()} only.` }, { status: 400 });
    }

    const application = await prisma.orphanApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    const canReviewerEdit = user.role === 'reviewer' && application.status === 'supervisor_approved';
    const canAdminEdit = user.role === 'admin' && ['reviewer_approved', 'admin_approved', 'validated'].includes(application.status);
    const canSuperAdminEdit = user.role === 'super_admin';

    if (application.createdById !== user.id && !canReviewerEdit && !canAdminEdit && !canSuperAdminEdit) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    if (user.role === 'field_worker' && !['draft', 'needs_correction'].includes(application.status)) {
      return NextResponse.json({ message: 'Uploads are only allowed for draft or returned applications.' }, { status: 409 });
    }

    let processedBody: File | Blob | ArrayBuffer | Uint8Array = file;
    let processedName = file.name;
    let finalMimeType = file.type;

    if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const compressedBuffer = await sharp(buffer)
        .webp({ quality: 80 })
        .toBuffer();

      processedBody = new Uint8Array(compressedBuffer);
      processedName = file.name.replace(/\.[^/.]+$/, '.webp');
      finalMimeType = 'image/webp';
    }

    const fileKey = generateFileKey(documentType, applicationId, processedName);
    const fileUrl = await uploadToR2(processedBody, fileKey, finalMimeType);
    const size = processedBody instanceof Uint8Array ? processedBody.byteLength : file.size;

    const document = await prisma.applicationDocument.create({
      data: {
        applicationId,
        fileKey,
        fileUrl,
        mimeType: finalMimeType,
        size,
        documentType,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const documentId = request.nextUrl.searchParams.get('documentId');
  if (!documentId) {
    return NextResponse.json({ message: 'Missing documentId' }, { status: 400 });
  }

  const document = await prisma.applicationDocument.findUnique({
    where: { id: documentId },
    include: { application: true },
  });

  if (!document) {
    return NextResponse.json({ message: 'Document not found' }, { status: 404 });
  }

  const canReviewerEdit = user.role === 'reviewer' && document.application.status === 'supervisor_approved';
  const canAdminEdit = user.role === 'admin' && ['reviewer_approved', 'admin_approved', 'validated'].includes(document.application.status);
  const canSuperAdminEdit = user.role === 'super_admin';

  if (document.application.createdById !== user.id && !canReviewerEdit && !canAdminEdit && !canSuperAdminEdit) {
    return NextResponse.json({ message: 'Access denied' }, { status: 403 });
  }

  if (user.role === 'field_worker' && !['draft', 'needs_correction'].includes(document.application.status)) {
    return NextResponse.json({ message: 'Documents can only be removed from draft or returned applications.' }, { status: 409 });
  }

  try {
    await deleteFromR2(document.fileKey);
    await prisma.applicationDocument.delete({ where: { id: documentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ message: 'Delete failed' }, { status: 500 });
  }
}


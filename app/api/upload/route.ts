import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadToR2, deleteFromR2, generateFileKey } from '@/lib/r2';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

export async function POST(request: NextRequest) {
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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ message: 'Invalid file type' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'File too large' }, { status: 400 });
    }

    const application = await prisma.orphanApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    if (application.createdById !== user.id && user.role !== 'admin') {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    let processedBody: File | Blob | ArrayBufferView = file;
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
        documentType: documentType as any,
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

  if (document.application.createdById !== user.id && user.role !== 'admin') {
    return NextResponse.json({ message: 'Access denied' }, { status: 403 });
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

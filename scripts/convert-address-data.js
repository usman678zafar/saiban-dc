const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const excelPath = path.join(process.cwd(), "pak_admin_boundaries.xlsx");

const workbook = XLSX.readFile(excelPath);

const admin1 = XLSX.utils.sheet_to_json(workbook.Sheets["pak_admin1"]);
const admin2 = XLSX.utils.sheet_to_json(workbook.Sheets["pak_admin2"]);
const admin3 = XLSX.utils.sheet_to_json(workbook.Sheets["pak_admin3"]);

const data = admin1.map((province) => {
  const provinceName = province.adm1_name;
  const provinceCode = province.adm1_pcode;

  const districts = admin2
    .filter((district) => district.adm1_pcode === provinceCode)
    .map((district) => {
      const districtName = district.adm2_name;
      const districtCode = district.adm2_pcode;

      const tehsils = admin3
        .filter((tehsil) => tehsil.adm2_pcode === districtCode)
        .map((tehsil) => ({
          name: tehsil.adm3_name,
          code: tehsil.adm3_pcode,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        name: districtName,
        code: districtCode,
        tehsils,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    province: provinceName,
    provinceCode,
    districts,
  };
});

const output = `// Auto-generated from pak_admin_boundaries.xlsx
// Do not edit manually. Re-run scripts/convert-address-data.js if dataset changes.

export const pakistanAddressData = ${JSON.stringify(data, null, 2)} as const;
`;

const outputPath = path.join(process.cwd(), "lib", "pakistan-address-data.ts");

fs.writeFileSync(outputPath, output, "utf8");

console.log("Address data generated successfully:");
console.log(outputPath);
console.log(`Provinces: ${data.length}`);

const districtCount = data.reduce((sum, p) => sum + p.districts.length, 0);
const tehsilCount = data.reduce(
  (sum, p) =>
    sum + p.districts.reduce((dSum, d) => dSum + d.tehsils.length, 0),
  0
);

console.log(`Districts: ${districtCount}`);
console.log(`Tehsils: ${tehsilCount}`);
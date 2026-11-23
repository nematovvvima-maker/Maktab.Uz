import type { ClassLetter } from '../types';

export interface DistrictCatalog {
  id: string;
  name: string;
  schools: string[];
}

export interface RegionCatalog {
  id: string;
  name: string;
  shortName: string;
  districts: DistrictCatalog[];
}

export const CLASS_LETTERS: ClassLetter[] = ['A', 'B', 'V', 'G', 'D'];
export const GRADE_NUMBERS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function toSchoolNames(nums: number[], extra: string[] = []): string[] {
  return [...nums.map((n) => `${n}-maktab`), ...extra];
}

export const REGIONS_CATALOG: RegionCatalog[] = [
  {
    id: 'toshkent_sh',
    name: 'Toshkent shahri',
    shortName: 'Toshkent sh.',
    districts: [
      {
        id: 'bektemir',
        name: 'Bektemir tumani',
        schools: toSchoolNames([23, 30, 289, 290, 291, 293]),
      },
      {
        id: 'chilonzor',
        name: 'Chilonzor tumani',
        schools: toSchoolNames([
          6, 8, 15, 66, 74, 79, 90, 101, 103, 114, 126, 128, 131, 138, 162, 163, 164, 168, 173,
          178, 179, 181, 182, 183, 184, 188, 195, 200, 201, 202, 217, 232, 270, 280, 281,
        ]),
      },
      {
        id: 'mirobod',
        name: 'Mirobod tumani',
        schools: toSchoolNames([
          31, 32, 56, 57, 60, 65, 83, 94, 110, 125, 147, 154, 158, 175, 213, 214, 218, 263, 294,
          328,
        ]),
      },
      {
        id: 'mirzo_ulugbek',
        name: "Mirzo Ulug'bek tumani",
        schools: toSchoolNames(
          [
            18, 27, 35, 49, 50, 54, 64, 71, 99, 105, 112, 120, 121, 142, 148, 171, 187, 205, 207,
            208, 209, 210, 211, 221, 222, 223, 225, 241, 248, 256, 275, 279, 286, 308,
          ],
          ['Prezident maktabi']
        ),
      },
      {
        id: 'olmazor',
        name: 'Olmazor tumani',
        schools: toSchoolNames(
          [
            1, 11, 16, 22, 24, 28, 36, 46, 100, 106, 111, 119, 133, 134, 146, 159, 165, 185, 191,
            196, 219, 224, 233, 234, 242, 243, 249, 261, 278, 298, 315, 326,
          ],
          ['Abu Ali ibn Sino nomidagi ixtisoslashtirilgan maktab']
        ),
      },
      {
        id: 'sergeli_yangihayot',
        name: 'Sergeli va Yangihayot tumanlari',
        schools: toSchoolNames([
          2, 6, 7, 8, 33, 47, 55, 68, 76, 104, 237, 264, 266, 267, 268, 269, 277, 284, 285, 300,
          301, 303, 305, 314, 317, 322, 329, 330, 331, 332,
        ]),
      },
      {
        id: 'shayxontohur',
        name: 'Shayxontohur tumani',
        schools: toSchoolNames([
          10, 13, 19, 20, 34, 37, 39, 40, 41, 42, 45, 59, 82, 84, 85, 102, 113, 115, 132, 136,
          141, 157, 167, 169, 180, 186, 192, 254, 262, 276, 299, 316, 320, 324,
        ]),
      },
      {
        id: 'uchtepa',
        name: 'Uchtepa tumani',
        schools: toSchoolNames([
          14, 38, 44, 62, 75, 78, 81, 107, 109, 116, 123, 129, 193, 194, 197, 199, 203, 228, 229,
          236, 238, 245, 251, 283, 287, 295, 296, 297, 312,
        ]),
      },
      {
        id: 'yakkasaroy',
        name: 'Yakkasaroy tumani',
        schools: toSchoolNames([25, 26, 48, 73, 89, 91, 118, 127, 135, 144, 160, 172, 239, 319]),
      },
      {
        id: 'yashnobod',
        name: 'Yashnobod tumani',
        schools: toSchoolNames([
          29, 52, 61, 67, 69, 77, 108, 145, 149, 151, 152, 153, 155, 156, 161, 166, 170, 198, 204,
          206, 212, 215, 216, 226, 227, 230, 231, 244, 255, 282, 307,
        ]),
      },
      {
        id: 'yunusobod',
        name: 'Yunusobod tumani',
        schools: toSchoolNames([
          5, 9, 12, 17, 21, 43, 51, 53, 58, 63, 70, 72, 80, 86, 87, 88, 96, 97, 98, 117, 122, 150,
          220, 235, 240, 246, 247, 250, 257, 258, 259, 260, 265, 271, 272, 273, 274, 288, 302, 313,
          327,
        ]),
      },
    ],
  },
  {
    id: 'toshkent_vil',
    name: 'Toshkent viloyati',
    shortName: 'Toshkent vil.',
    districts: [
      { id: 'chirchiq', name: 'Chirchiq shahri', schools: toSchoolNames([1, 5, 9, 14, 20]) },
      { id: 'olmaliq', name: 'Olmaliq shahri', schools: toSchoolNames([2, 8, 15, 21]) },
      { id: 'qibray', name: 'Qibray tumani', schools: toSchoolNames([1, 7, 12, 24]) },
      { id: 'zangiota', name: 'Zangiota tumani', schools: toSchoolNames([3, 11, 19, 32]) },
    ],
  },
  {
    id: 'andijon',
    name: 'Andijon viloyati',
    shortName: 'Andijon',
    districts: [
      { id: 'andijon_sh', name: 'Andijon shahri', schools: toSchoolNames([1, 4, 13, 24, 35]) },
      { id: 'asaka', name: 'Asaka tumani', schools: toSchoolNames([2, 10, 18, 27]) },
      { id: 'shahrixon', name: 'Shahrixon tumani', schools: toSchoolNames([3, 12, 21, 30]) },
    ],
  },
  {
    id: 'buxoro',
    name: 'Buxoro viloyati',
    shortName: 'Buxoro',
    districts: [
      { id: 'buxoro_sh', name: 'Buxoro shahri', schools: toSchoolNames([1, 6, 17, 29, 34]) },
      { id: 'gijduvon', name: "G'ijduvon tumani", schools: toSchoolNames([2, 9, 15, 28]) },
      { id: 'kogon', name: 'Kogon shahri', schools: toSchoolNames([3, 7, 11, 19]) },
    ],
  },
  {
    id: 'fargona',
    name: "Farg'ona viloyati",
    shortName: "Farg'ona",
    districts: [
      { id: 'fargona_sh', name: "Farg'ona shahri", schools: toSchoolNames([1, 5, 10, 22, 40]) },
      { id: 'qoqon', name: "Qo'qon shahri", schools: toSchoolNames([3, 8, 16, 25]) },
      { id: 'margilon', name: "Marg'ilon shahri", schools: toSchoolNames([2, 12, 18, 31]) },
    ],
  },
  {
    id: 'jizzax',
    name: 'Jizzax viloyati',
    shortName: 'Jizzax',
    districts: [
      { id: 'jizzax_sh', name: 'Jizzax shahri', schools: toSchoolNames([1, 8, 14, 22]) },
      { id: 'zomin', name: 'Zomin tumani', schools: toSchoolNames([2, 6, 15, 29]) },
    ],
  },
  {
    id: 'xorazm',
    name: 'Xorazm viloyati',
    shortName: 'Xorazm',
    districts: [
      { id: 'urganch', name: 'Urganch shahri', schools: toSchoolNames([1, 5, 11, 19, 26]) },
      { id: 'xiva', name: 'Xiva shahri', schools: toSchoolNames([2, 7, 12, 20]) },
    ],
  },
  {
    id: 'namangan',
    name: 'Namangan viloyati',
    shortName: 'Namangan',
    districts: [
      { id: 'namangan_sh', name: 'Namangan shahri', schools: toSchoolNames([1, 7, 15, 31, 48]) },
      { id: 'chust', name: 'Chust tumani', schools: toSchoolNames([2, 10, 19, 28]) },
    ],
  },
  {
    id: 'navoiy',
    name: 'Navoiy viloyati',
    shortName: 'Navoiy',
    districts: [
      { id: 'navoiy_sh', name: 'Navoiy shahri', schools: toSchoolNames([1, 4, 11, 16, 22]) },
      { id: 'zarafshon', name: 'Zarafshon shahri', schools: toSchoolNames([2, 6, 9, 13]) },
    ],
  },
  {
    id: 'qashqadaryo',
    name: 'Qashqadaryo viloyati',
    shortName: 'Qashqadaryo',
    districts: [
      { id: 'qarshi', name: 'Qarshi shahri', schools: toSchoolNames([1, 5, 12, 23, 35]) },
      { id: 'shahrisabz', name: 'Shahrisabz shahri', schools: toSchoolNames([2, 8, 14, 21]) },
    ],
  },
  {
    id: 'samarqand',
    name: 'Samarqand viloyati',
    shortName: 'Samarqand',
    districts: [
      { id: 'samarqand_sh', name: 'Samarqand shahri', schools: toSchoolNames([1, 9, 21, 37, 51]) },
      { id: 'urgut', name: 'Urgut tumani', schools: toSchoolNames([3, 14, 25, 42]) },
    ],
  },
  {
    id: 'sirdaryo',
    name: 'Sirdaryo viloyati',
    shortName: 'Sirdaryo',
    districts: [
      { id: 'guliston', name: 'Guliston shahri', schools: toSchoolNames([1, 4, 8, 16]) },
      { id: 'yangiyer', name: 'Yangiyer shahri', schools: toSchoolNames([2, 5, 9, 11]) },
    ],
  },
  {
    id: 'surxondaryo',
    name: 'Surxondaryo viloyati',
    shortName: 'Surxondaryo',
    districts: [
      { id: 'termiz', name: 'Termiz shahri', schools: toSchoolNames([1, 6, 12, 18, 24]) },
      { id: 'denov', name: 'Denov tumani', schools: toSchoolNames([2, 10, 17, 33]) },
    ],
  },
  {
    id: 'qoraqalpogiston',
    name: "Qoraqalpog'iston Respublikasi",
    shortName: "Qoraqalpog'iston",
    districts: [
      { id: 'nukus', name: 'Nukus shahri', schools: toSchoolNames([1, 8, 17, 25, 37]) },
      { id: 'beruniy', name: 'Beruniy tumani', schools: toSchoolNames([2, 9, 15, 28]) },
    ],
  },
];

export const DEFAULT_REGION = 'Toshkent shahri';
export const DEFAULT_DISTRICT = 'Yakkasaroy tumani';
export const DEFAULT_SCHOOL = '91-maktab';

export function getRegionById(regionId: string): RegionCatalog | undefined {
  return REGIONS_CATALOG.find((r) => r.id === regionId);
}

export function getRegionByName(regionName: string): RegionCatalog | undefined {
  return REGIONS_CATALOG.find((r) => r.name === regionName);
}

export function getDistrictById(
  regionId: string,
  districtId: string
): DistrictCatalog | undefined {
  return getRegionById(regionId)?.districts.find((d) => d.id === districtId);
}

export function formatClassCode(gradeStr: string, classLetter?: ClassLetter): string {
  const num = gradeStr.match(/\d+/)?.[0] || '1';
  return `${num}-${classLetter || 'A'}`;
}

export function getTashkentSchoolStats(): { districts: number; schools: number } {
  const tashkent = getRegionById('toshkent_sh');
  if (!tashkent) return { districts: 0, schools: 0 };
  const schools = tashkent.districts.reduce((acc, d) => acc + d.schools.length, 0);
  return { districts: tashkent.districts.length, schools };
}

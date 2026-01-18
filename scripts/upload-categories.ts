import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Supabase 클라이언트 설정 (서비스 역할 키 필요)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("환경변수가 설정되지 않았습니다.");
  console.error("NEXT_PUBLIC_SUPABASE_URL와 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 카테고리 정의 (파일명 기준)
const categories = [
  { name: "BEST 체험", filename: "best체험.svg", sort_order: 1 },
  { name: "계절 특화체험", filename: "계절특화체험.svg", sort_order: 2 },
  { name: "농장/자연", filename: "농장:자연.svg", sort_order: 3 },
  { name: "과학/박물관", filename: "과학:박물관.svg", sort_order: 4 },
  { name: "미술/전시회", filename: "미술:전시회.svg", sort_order: 5 },
  { name: "요리/클래스", filename: "요리:클래스.svg", sort_order: 6 },
  { name: "물놀이/수영장", filename: "물놀이:수영장.svg", sort_order: 7 },
  { name: "동물/야외활동", filename: "동물:야외활동.svg", sort_order: 8 },
  { name: "뮤지컬/연극", filename: "뮤지컬:연극.svg", sort_order: 9 },
  { name: "음악/예술", filename: "음악:예술.svg", sort_order: 10 },
  { name: "놀이동산/수족관", filename: "놀이동산:수족관.svg", sort_order: 11 },
  { name: "직업/전통/안전", filename: "직업:전통:안전.svg", sort_order: 12 },
];

async function uploadIcon(filename: string): Promise<string | null> {
  const filePath = path.join("/Users/goalle/Downloads", filename);

  if (!fs.existsSync(filePath)) {
    console.error(`파일을 찾을 수 없습니다: ${filePath}`);
    return null;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const storagePath = `categories/${filename.replace(/:/g, "-")}`;

  const { data, error } = await supabase.storage
    .from("public")
    .upload(storagePath, fileBuffer, {
      contentType: "image/svg+xml",
      upsert: true,
    });

  if (error) {
    console.error(`업로드 실패 (${filename}):`, error);
    return null;
  }

  // Public URL 생성
  const { data: publicUrlData } = supabase.storage
    .from("public")
    .getPublicUrl(storagePath);

  return publicUrlData.publicUrl;
}

async function main() {
  console.log("카테고리 아이콘 업로드 및 등록 시작...\n");

  for (const category of categories) {
    console.log(`처리 중: ${category.name}`);

    // 1. 아이콘 업로드
    const iconUrl = await uploadIcon(category.filename);
    if (!iconUrl) {
      console.error(`  - 아이콘 업로드 실패, 건너뜀`);
      continue;
    }
    console.log(`  - 아이콘 업로드 완료: ${iconUrl}`);

    // 2. 카테고리 등록 (upsert)
    const { data, error } = await supabase
      .from("categories")
      .upsert(
        {
          name: category.name,
          icon_url: iconUrl,
          sort_order: category.sort_order,
          parent_id: null,
          depth: 1,
          is_active: true,
        },
        {
          onConflict: "name",
        }
      )
      .select();

    if (error) {
      console.error(`  - 카테고리 등록 실패:`, error);
    } else {
      console.log(`  - 카테고리 등록 완료`);
    }
  }

  console.log("\n완료!");
}

main().catch(console.error);

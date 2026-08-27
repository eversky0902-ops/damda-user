import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { BusinessImageGallery } from "@/components/businesses/BusinessImageGallery";
import { BusinessReservationFlow } from "@/components/businesses/BusinessReservationFlow";
import { DetailSectionNav } from "@/components/businesses/DetailSectionNav";
import {
  getBusinessOwnerById,
  getProductsByBusinessOwnerResult,
  type BusinessHour,
} from "@/services/productService";
import { getLatestLegalDocument } from "@/services/contentService";

interface BusinessPageProps {
  params: Promise<{ id: string }>;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export async function generateMetadata({ params }: BusinessPageProps) {
  const { id } = await params;
  const business = await getBusinessOwnerById(id);
  const introduction = business?.introduction || business?.place_profile?.introduction;

  return business
    ? {
        title: business.name,
        description: introduction || `${business.name}의 체험 상품을 확인하세요.`,
        alternates: { canonical: `/businesses/${id}` },
        openGraph: {
        title: business.name,
          description: introduction || `${business.name}의 체험 상품을 확인하세요.`,
          url: `/businesses/${id}`,
          type: "website",
          images: business.logo_url ? [business.logo_url] : undefined,
        },
      }
    : { title: "사업장을 찾을 수 없습니다" };
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { id } = await params;
  const [business, productsResult, refundPolicy] = await Promise.all([
    getBusinessOwnerById(id),
    getProductsByBusinessOwnerResult(id),
    getLatestLegalDocument("refund-policy"),
  ]);

  if (!business) notFound();

  const products = productsResult.data;
  const introduction = business.introduction || business.place_profile?.introduction;
  const summary = business.summary || introduction;
  const publicPhone = business.place_profile?.public_phone || business.contact_phone;
  const fullAddress = [business.address, business.address_detail].filter(Boolean).join(" ");
  const registeredBusinessImages = business.images.map((image) => ({ id: image.id, image_url: image.image_url }));
  const productFallbackUrls = [...products]
    .sort((left, right) => (
      right.view_count - left.view_count
      || new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    ))
    .flatMap((product) => [product.thumbnail, ...(product.images || []).map((image) => image.image_url)])
    .filter((url, index, urls): url is string => Boolean(url) && urls.indexOf(url) === index);
  const businessImages = registeredBusinessImages.length
    ? registeredBusinessImages
    : productFallbackUrls.map((image_url, index) => ({ id: `product-fallback-${index}`, image_url }));
  const galleryThumbnail = businessImages[0]?.image_url || business.logo_url || "";
  const reviewCount = products.reduce((sum, product) => sum + (product.review_count || 0), 0);
  const reviewScoreTotal = products.reduce(
    (sum, product) => sum + (product.average_rating || 0) * (product.review_count || 0),
    0
  );
  const averageRating = reviewCount ? Math.round((reviewScoreTotal / reviewCount) * 10) / 10 : 0;
  const minPrice = products.length ? Math.min(...products.map((product) => product.sale_price)) : null;
  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://withdamda.kr/businesses/${id}#business`,
    name: business.name,
    url: `https://withdamda.kr/businesses/${id}`,
    description: summary || introduction || `${business.name}의 현장체험 프로그램`,
    image: galleryThumbnail || undefined,
    telephone: publicPhone || undefined,
    address: fullAddress
      ? {
          "@type": "PostalAddress",
          streetAddress: fullAddress,
          addressCountry: "KR",
        }
      : undefined,
    aggregateRating: reviewCount
      ? {
          "@type": "AggregateRating",
          ratingValue: averageRating,
          reviewCount,
          bestRating: 5,
        }
      : undefined,
    priceRange: minPrice !== null ? `${minPrice.toLocaleString("ko-KR")}원부터` : undefined,
    mainEntityOfPage: `https://withdamda.kr/businesses/${id}`,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(businessJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <nav className="flex min-w-0 items-center text-sm text-gray-500" aria-label="현재 위치">
            <Link href="/home" className="shrink-0 hover:text-gray-900">홈</Link>
            <ChevronRight className="mx-2 h-4 w-4 shrink-0" />
            <Link href="/products" className="shrink-0 hover:text-gray-900">체험 사업장</Link>
            <ChevronRight className="mx-2 h-4 w-4 shrink-0" />
            <span className="truncate font-medium text-gray-900">{business.name}</span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
        <section aria-label="사업장 이미지" className="overflow-hidden rounded-2xl bg-white sm:rounded-3xl">
          <BusinessImageGallery
            images={businessImages}
            fallbackImage={galleryThumbnail}
            businessName={business.name}
          />
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:mt-6 sm:rounded-3xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-damda-teal-dark">검증된 체험 사업장</p>
              <h1 className="mt-1 break-keep text-2xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
                {business.name}
              </h1>
              {summary && (
                <p className="mt-3 max-w-3xl break-keep text-base leading-7 text-gray-600 sm:text-lg">
                  {summary}
                </p>
              )}
            </div>
            {reviewCount > 0 && (
              <div className="flex shrink-0 items-center gap-2 rounded-xl bg-damda-yellow-light px-4 py-3">
                <Star className="h-5 w-5 fill-damda-yellow text-damda-yellow-dark" />
                <strong className="text-lg">{averageRating.toFixed(1)}</strong>
                <span className="text-sm text-gray-600">후기 {reviewCount}개</span>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {fullAddress && (
              <span className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-damda-teal" />
                {fullAddress}
              </span>
            )}
            {publicPhone && (
              <a href={`tel:${publicPhone}`} className="flex items-center gap-2 hover:text-gray-950">
                <Phone className="h-4 w-4 text-damda-teal" />
                {publicPhone}
              </a>
            )}
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="핵심 안내">
          <SummaryTile icon={<ShieldCheck />} label="담다 확인" value="입점 확인 사업장" />
          <SummaryTile icon={<Sparkles />} label="등록 상품" value={`${products.length}개 상품 비교`} />
          <SummaryTile
            icon={<Users />}
            label="상품별 예약"
            value={minPrice !== null ? `${minPrice.toLocaleString("ko-KR")}원부터` : "상품 준비 중"}
          />
        </section>

        <DetailSectionNav />

        <section id="products" className="mt-10 scroll-mt-[168px] sm:mt-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-damda-teal-dark">PRODUCT</p>
              <h2 className="mt-1 text-2xl font-extrabold text-gray-950 sm:text-3xl">상품 선택</h2>
              <p className="mt-2 break-keep text-sm leading-6 text-gray-600 sm:text-base">
                상품별 이미지, 가격, 인원과 체험시간을 비교해 원하는 프로그램을 선택하세요.
              </p>
            </div>
            <span className="text-sm text-gray-500">총 {products.length}개</span>
          </div>

          {productsResult.error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-white p-8 text-center">
              <p className="font-semibold text-gray-950">상품 정보를 불러오지 못했습니다.</p>
              <p className="mt-1 text-sm text-gray-500">잠시 후 페이지를 새로고침해주세요.</p>
              <Link href={`/businesses/${id}`} className="mt-4 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
                다시 시도
              </Link>
            </div>
          ) : products.length ? (
            <BusinessReservationFlow products={products} businessLogo={business.logo_url} />
          ) : (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center">
              <p className="font-semibold text-gray-950">현재 예약 가능한 상품이 없습니다.</p>
              <p className="mt-2 text-sm text-gray-500">새로운 체험 상품을 준비하고 있습니다.</p>
            </div>
          )}
        </section>

        <div className="mt-12 space-y-4 sm:mt-16">
          <InfoSection id="location-transport" title="위치 / 교통" icon={<MapPin />}>
            {fullAddress ? (
              <p className="font-medium text-gray-900">{fullAddress}</p>
            ) : (
              <EmptySectionText>등록된 사업장 주소가 없습니다.</EmptySectionText>
            )}
            {business.place_profile?.directions && (
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">{business.place_profile.directions}</p>
            )}
          </InfoSection>

          <InfoSection id="review-summary" title="후기 요약" icon={<Star />}>
            {reviewCount > 0 ? (
              <>
                <div className="flex items-center gap-3">
                  <strong className="text-3xl text-gray-950">{averageRating.toFixed(1)}</strong>
                  <div>
                    <div className="flex gap-0.5 text-damda-yellow-dark" aria-label={`평점 ${averageRating.toFixed(1)}점`}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className={`h-4 w-4 ${index < Math.round(averageRating) ? "fill-current" : "text-gray-300"}`} />
                      ))}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">등록 상품 후기 총 {reviewCount}개</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-600">각 상품의 상세페이지에서 실제 이용 후기를 확인할 수 있습니다.</p>
              </>
            ) : (
              <EmptySectionText>아직 등록된 이용 후기가 없습니다.</EmptySectionText>
            )}
          </InfoSection>

          <InfoSection id="business-introduction" title="사업장 소개" icon={<Building2 />}>
            {introduction ? (
              <p className="whitespace-pre-line break-keep text-sm leading-7 text-gray-700 sm:text-base">{introduction}</p>
            ) : (
              <EmptySectionText>사업장 소개를 준비하고 있습니다.</EmptySectionText>
            )}
          </InfoSection>

          <InfoSection id="facilities-services" title="시설 / 서비스" icon={<Sparkles />}>
            {business.facilities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {business.facilities.map((facility) => <span key={facility} className="rounded-full bg-damda-teal-light px-3 py-1.5 text-sm font-medium text-damda-teal-dark">{facility}</span>)}
              </div>
            )}
            <div className={business.facilities.length ? "mt-4" : ""}>
              <p className="text-sm font-semibold text-gray-900">주차 {business.parking_available ? "가능" : "불가"}</p>
              {business.parking_notice && <p className="mt-2 whitespace-pre-line text-sm leading-7 text-gray-600">{business.parking_notice}</p>}
            </div>
            {!business.facilities.length && !business.parking_notice && !business.parking_available && <EmptySectionText>시설 및 제공 서비스 정보는 사업주 확인 후 업데이트됩니다.</EmptySectionText>}
          </InfoSection>

          <InfoSection id="usage-guide" title="이용안내" icon={<Clock3 />}>
            {business.hours.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {business.hours.map((hour) => <BusinessHourRow key={hour.id} hour={hour} />)}
              </div>
            )}
            {business.place_profile?.reservation_notice && (
              <p className="whitespace-pre-line text-sm leading-7 text-gray-700">{business.place_profile.reservation_notice}</p>
            )}
            {business.common_guide && <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-700">{business.common_guide}</p>}
            {business.common_precautions && <p className="mt-4 whitespace-pre-line rounded-xl bg-amber-50 p-4 text-sm leading-7 text-gray-700">{business.common_precautions}</p>}
            {!business.hours.length && !business.place_profile?.reservation_notice && !business.common_guide && !business.common_precautions && (
              <EmptySectionText>상세 이용안내를 준비하고 있습니다.</EmptySectionText>
            )}
          </InfoSection>

          <InfoSection id="reservation-notice" title="예약공지" icon={<ShieldCheck />}>
            {refundPolicy?.content ? (
              <details className="group">
                <summary className="cursor-pointer list-none font-semibold text-gray-900 marker:hidden">
                  예약 및 취소·환불 정책 자세히 보기 <span className="ml-1 text-damda-teal-dark group-open:hidden">+</span><span className="ml-1 hidden text-damda-teal-dark group-open:inline">−</span>
                </summary>
                <div
                  className="mt-4 break-words text-sm leading-7 text-gray-700 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3"
                  dangerouslySetInnerHTML={{ __html: refundPolicy.content }}
                />
              </details>
            ) : (
              <EmptySectionText>예약 전 확인사항을 준비하고 있습니다.</EmptySectionText>
            )}
          </InfoSection>
        </div>
      </main>
    </div>
  );
}

function SummaryTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-damda-yellow-light text-damda-yellow-dark [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </span>
      <div>
        <span className="block text-xs text-gray-500">{label}</span>
        <strong className="mt-0.5 block text-sm text-gray-900">{value}</strong>
      </div>
    </div>
  );
}

function InfoSection({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[168px] rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-gray-950 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-damda-teal">
        {icon}{title}
      </h2>
      {children}
    </section>
  );
}

function EmptySectionText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-7 text-gray-500">{children}</p>;
}

function BusinessHourRow({ hour }: { hour: BusinessHour }) {
  const time = hour.is_closed
    ? "휴무"
    : hour.open_time && hour.close_time
      ? `${hour.open_time.slice(0, 5)} ~ ${hour.close_time.slice(0, 5)}`
      : "운영시간 문의";
  const breakTime = !hour.is_closed && hour.break_start && hour.break_end
    ? ` · 휴게 ${hour.break_start.slice(0, 5)}~${hour.break_end.slice(0, 5)}`
    : "";

  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
      <span className="font-medium text-gray-700">{DAY_LABELS[hour.day_of_week]}요일</span>
      <span className={hour.is_closed ? "font-semibold text-red-500" : "text-gray-600"}>{time}{breakTime}</span>
    </div>
  );
}

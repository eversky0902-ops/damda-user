import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding (Fixed) */}
      <div className="fixed left-0 top-0 hidden h-screen w-1/2 overflow-hidden lg:block">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=1920&auto=format&fit=crop')`,
          }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />

        {/* Content */}
        <div className="relative flex h-full flex-col items-center justify-center p-12 text-white">
          <div className="max-w-md text-center">
            <Link href="/" className="mb-8 inline-block">
              <Image
                src="/logo-white.svg"
                alt="담다"
                width={140}
                height={52}
                className="mx-auto"
              />
            </Link>
            <h1 className="mb-4 text-3xl font-bold leading-tight">
              국공립 어린이집을 위한
              <br />
              현장체험 예약 플랫폼
            </h1>
            <p className="text-lg text-white/80">
              검증된 체험학습 프로그램을 간편하게 예약하고,
              <br />
              아이들에게 잊지 못할 추억을 선물하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form (Scrollable) */}
      <div className="flex min-h-screen w-full flex-col bg-white lg:ml-[50%] lg:w-1/2">
        <div className="flex items-center justify-between p-4 lg:p-8">
          <Link href="/" className="lg:hidden">
            <Image src="/logo.svg" alt="담다" width={80} height={32} />
          </Link>
          <div className="hidden lg:block" />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

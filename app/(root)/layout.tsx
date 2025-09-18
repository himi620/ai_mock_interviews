import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/actions/auth.action";

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect("/sign-in");

  return (
    <div className="root-layout">
      <nav className="flex items-center justify-between p-4 bg-dark-200 shadow-sm rounded-lg">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="AI Mock Interviews Logo" width={38} height={32} />
          <h2 className="text-light-100">AI Mock Interviews</h2>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link href="/" className="text-light-100 hover:text-primary-100 transition-colors">
            Interviews
          </Link>
          <Link href="/recruit/dashboard" className="text-light-100 hover:text-primary-100 transition-colors">
            Recruitment
          </Link>
        </div>
      </nav>

      {children}
    </div>
  );
};

export default Layout;

import React from 'react'
import { useState } from "react";
import Image from 'next/image';
import { Input } from "@/components/ui/input";
import CustomBtn from './CustomBtn';

const Navbar = () => {
    const [lang, setLang] = useState<"EN" | "FR">("EN");
  
  return (
    <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-1 text-[14px] backdrop-blur-md bg-card/85">

        {/* Left Nav */}
        <div className="flex items-center gap-8">
          <Image src="/assets/logo.png" alt="Nestlé Logo" width={70} height={60} className="rounded-full" />
          <div className="hidden md:flex items-center gap-6 text-muted-foreground">
            <a href="#" className="hover:text-foreground transition">Brand</a>
            <a href="#" className="hover:text-foreground transition">All Recipes</a>
            <a href="#" className="hover:text-foreground transition">Sustainability</a>
            <a href="#" className="hover:text-foreground transition">About Nestlé</a>
          </div>
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-6">
        <Input
          placeholder="Search recipes..."
          className="w-[200px] bg-input text-[10px] text-xs border border-muted-foreground rounded-[6px] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-muted-foreground  focus:outline-none focus:ring-0"
        />

          <a href="#" className="text-muted-foreground hover:text-foreground transition">Support</a>
          <CustomBtn>Sign Up</CustomBtn>

          <div className="h-6 w-px bg-foreground" />

          <CustomBtn onClick={() => setLang(lang === "EN" ? "FR" : "EN")}>
            {lang}
          </CustomBtn>

        </div>
      </nav>
  )
}

export default Navbar

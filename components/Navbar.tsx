'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import CustomBtn from './CustomBtn';
import {  Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CustomBtn2 from './CustomBtn2';

const DropdownIcon = () => (
  <svg
  className="w-2.5 h-2.5 fill-muted-foreground transform transition-transform duration-200 group-hover:rotate-180 group-hover:fill-[#027b9cf4]"
  viewBox="0 0 10 6"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M5 6L0 0h10L5 6z" />
  </svg>
);

const Navbar = () => {
  const [lang, setLang] = useState<"EN" | "FR">("EN");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 md:px-12 py-2 backdrop-blur-md bg-card/85 z-150">

      {/* Left Nav */}
      <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
        <Image src="/assets/logo.png" alt="Nestlé Logo" width={50} height={50} className="rounded-full" />
        <div className="hidden md:flex items-center gap-6 text-muted-foreground text-sm sm:text-[15px]">
        <a href="#" className="group hover:text-[#027b9cf4] transition font-semibold flex items-center gap-1">
          Brand
          <DropdownIcon />
        </a>

        <a href="#" className="group hover:text-[#027b9cf4] transition font-semibold flex items-center gap-1">
          All Recipes
          <DropdownIcon />
        </a>

        <a href="#" className="hover:text-[#027b9cf4] transition font-semibold">
          Sustainability
        </a>

        <a href="#" className="group hover:text-[#027b9cf4] transition font-semibold flex items-center gap-1">
          About Nestle
          <DropdownIcon />
        </a>
        </div>
      </div>

      {/* Right Nav */}
      <div className="hidden md:flex items-center gap-1 sm:gap-2">
        <Input
          placeholder="Search recipes..."
          className="w-[120px] sm:w-[160px] md:w-[200px] text-xs bg-input border border-muted-foreground rounded-[6px] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-muted-foreground mr-3"
        />

        <CustomBtn2 className='hover:text-[#027b9cf4] font-semibold'>Support</CustomBtn2>
        <div className="h-6 w-px bg-muted-foreground opacity-50" />
        
        <div className="hidden md:flex items-center gap-1 sm:gap-2">

          <CustomBtn2 className='hover:text-[#027b9cf4] font-semibold'>Sign Up</CustomBtn2>

          <div className="h-6 w-px bg-muted-foreground opacity-50" />

          <CustomBtn className='ml-[5px]' onClick={() => setLang(lang === "EN" ? "FR" : "EN")}>
            {lang}
          </CustomBtn>

        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center">
        <button onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}


      <AnimatePresence>
  {menuOpen && (
    <motion.div
      key="mobile-menu"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="absolute top-full left-0 w-full bg-card text-muted-foreground border-t border-border shadow-lg md:hidden z-[99]"
    >
      <div className="px-4 py-4 space-y-4">

        {/* Search */}
        <div className="w-full">
          <Input
            placeholder="Search recipes..."
            className="w-full text-xs bg-input border border-muted-foreground rounded-md focus-visible:outline-none focus-visible:ring-0 focus-visible:border-muted-foreground"
          />
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col space-y-2 text-sm">
          <a href="#" className="hover:text-foreground transition">Brand</a>
          <a href="#" className="hover:text-foreground transition">All Recipes</a>
          <a href="#" className="hover:text-foreground transition">Sustainability</a>
          <a href="#" className="hover:text-foreground transition">About Nestlé</a>
          <a href="#" className="hover:text-foreground transition">Support</a>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <CustomBtn>Sign Up</CustomBtn>
          <CustomBtn onClick={() => setLang(lang === "EN" ? "FR" : "EN")}>
            {lang}
          </CustomBtn>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
    </nav>
  );
};

export default Navbar;

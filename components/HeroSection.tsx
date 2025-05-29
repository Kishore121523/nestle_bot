"use client";

import Navbar from "./Navbar";
import CustomBtn from "./CustomBtn";

export default function HeroSection() {
  return (
    <div className="w-full border-b border-border bg-background text-foreground">
      <Navbar />

      <section
        className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4 sm:px-8"
        style={{ backgroundImage: `url('/hero-bg.png')` }}
      >
        {/* Dark overlay with blur */}
        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]" />

        {/* Hero Content Card */}
        <div className="relative z-10 w-full max-w-2xl bg-card/85 backdrop-blur-md border border-border text-card-foreground rounded-xl shadow-xl p-6 sm:p-8 md:p-10 mx-auto md:ml-auto md:mr-12">
          <h2 className="text-xl sm:text-2xl md:text-[2rem] font-bold mb-3">
            Discover Recipes Made with Nestlé
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg mb-6">
            Explore delicious meals, sustainable practices, and everything you need to bring Nestlé into your kitchen.
          </p>

          <CustomBtn>Get Inspired</CustomBtn>
        </div>
      </section>
    </div>
  );
}

"use client";

import Navbar from "./Navbar";
import CustomBtn from "./CustomBtn";

export default function HeroSection() {
  return (
    <div className="w-full border-b border-border bg-background text-foreground ">
      <Navbar />

      <section
        className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/hero-bg-3.png')` }}
      >
        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"></div>

        <div className="relative z-10 w-full max-w-2xl ml-auto mr-12 bg-card/85 backdrop-blur-md border border-border text-card-foreground rounded-xl shadow-xl p-8 md:p-10">
          <h2 className="text-xl md:text-[2rem] font-bold mb-3">
            Discover Recipes Made with Nestlé
          </h2>
          <p className="text-muted-foreground text-base md:text-lg mb-6">
            Explore delicious meals, sustainable practices, and everything you need to bring Nestlé into your kitchen.
          </p>

          <CustomBtn>Get Inspired</CustomBtn>
        </div>

      </section>
    </div>
  );
}

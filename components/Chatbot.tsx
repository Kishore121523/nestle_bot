'use client';

import { useState } from "react";
import ChatButton from "./ChatButton";
import ChatWindow from "./ChatWindow";

export default function Chatbot() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ChatWindow open={open} onClose={() => setOpen(false)} />
      <ChatButton onClick={() => setOpen(true)} />
    </>
  );
}

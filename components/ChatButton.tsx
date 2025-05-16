export default function ChatButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      
      className="fixed bottom-8 right-8 p-5 rounded-[50%] shadow-xl transition hover:bg-[#494949] bg-foreground cursor-pointer"
    >
      <div className="flex items-center gap-2 text-xl">
        💬
      </div>

      <span className="absolute bottom-2 right-0 w-3 h-3 bg-destructive rounded-full animate-ping"></span>
      <span className="absolute bottom-2 right-0 w-3 h-3 bg-destructive rounded-full"></span>
    </button>
  );
}

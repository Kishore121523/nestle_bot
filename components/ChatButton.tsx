export default function ChatButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 p-3 rounded-full shadow-xl bg-foreground text-background cursor-pointer transform hover:scale-105 transition duration-200 ease-in-out"
      >
      <div className="flex items-center justify-center w-10 h-10 text-xl rounded-full bg-foreground text-background">
        💬
      </div>

      <span className="absolute bottom-2 right-0 w-3 h-3 bg-destructive rounded-full animate-ping"></span>
      <span className="absolute bottom-2 right-0 w-3 h-3 bg-destructive rounded-full"></span>
    </button>
  );
}

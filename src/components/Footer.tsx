export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-muted-foreground">
      <div className="mx-auto max-w-6xl px-6">
        <p>
          © {new Date().getFullYear()} AI StudyMate Pro. Developed by{" "}
          <span className="text-gradient font-semibold">Junaid Raza Qureshi</span>
        </p>
      </div>
    </footer>
  );
}

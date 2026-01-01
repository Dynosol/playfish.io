const Footer = () => {
  return (
    <footer
      className="border-t border-gray-200 bg-background py-3 px-4"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}
    >
      <div className="container mx-auto flex justify-center gap-9 text-sm text-muted-foreground">
        <a href="/rules" className="hover:text-foreground transition-colors">Help</a>
        <a href="/about" className="hover:text-foreground transition-colors">About</a>
        <a href="https://github.com/Dynosol/fish" className="hover:text-foreground transition-colors">GitHub</a>
      </div>
    </footer>
  );
};

export default Footer;

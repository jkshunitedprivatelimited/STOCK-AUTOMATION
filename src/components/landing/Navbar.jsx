import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "About", href: "/#about" },
    { name: "Services", href: "/#services" },
    { name: "Brands", href: "/#our-brands" },
    { name: "Contact", href: "/#contact" },
  ];

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-white shadow-md py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src="/logo.jpg" alt="JKSH United Logo" className="h-10 md:h-12 w-auto object-contain rounded-full" />
            <span className={`font-bold text-xl md:text-2xl tracking-tight transition-colors duration-300 ${isScrolled ? "text-green-900" : "text-white"}`}>
              JKSH United
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex space-x-6">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-green-500 ${
                    isScrolled ? "text-slate-700" : "text-white drop-shadow-sm"
                  }`}
                >
                  {link.name}
                </a>
              ))}
            </div>
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-2.5 rounded-full font-bold text-white bg-green-600 hover:bg-green-700 transition-all transform hover:-translate-y-0.5 shadow-md shadow-green-600/20"
            >
              Login
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`focus:outline-none ${isScrolled ? "text-green-900" : "text-white"}`}
            >
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-white shadow-xl transition-all duration-300 overflow-hidden ${
          mobileMenuOpen ? "max-h-96 border-t border-gray-100" : "max-h-0"
        }`}
      >
        <div className="px-4 py-6 space-y-4 flex flex-col">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-800 font-medium hover:text-green-600 px-2 py-1"
            >
              {link.name}
            </a>
          ))}
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-800 transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

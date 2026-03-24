import React from "react";
import { MessageCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <div className="flex items-center gap-4 mb-6 md:mb-0">
            <img src="/logo.jpg" alt="JKSH United Logo" className="h-12 w-12 rounded-full border-2 border-gray-700" />
            <div>
              <h3 className="text-2xl font-bold tracking-tight">JKSH United Private Limited</h3>
              <p className="text-gray-400 text-sm mt-1">United by vision, driven by excellence</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <a 
              href="https://wa.me/919390658544" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-full font-medium transition-colors"
            >
              <MessageCircle size={20} /> Chat with us on WhatsApp
            </a>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400 gap-4">
          <p>© 2026 JKSH United Private Limited. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Registered under MCA, Government of India
          </p>
          <div className="flex flex-wrap items-center gap-4 md:gap-6 justify-center md:justify-end">
            <a href="/careers" className="hover:text-white transition-colors font-medium text-gray-300">Careers</a>
            <div className="w-px h-4 bg-gray-700 hidden md:block"></div>
            <a href="/#legal-policies" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/#legal-policies" className="hover:text-white transition-colors">Terms of Use</a>
            <a href="/#legal-policies" className="hover:text-white transition-colors">Refund Policy</a>
          </div>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;

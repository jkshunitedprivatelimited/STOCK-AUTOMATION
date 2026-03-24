import React from "react";
import { Building2, FileText, Landmark, MapPin, BadgeCheck, Calendar, CheckCircle } from "lucide-react";

const CompanyInfo = () => {
  return (
    <section id="company-info" className="py-24 bg-slate-50 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12 animate-on-scroll">
          <div className="inline-block mb-4 border border-blue-200 bg-blue-50 px-3 py-1 rounded-full text-blue-700 font-semibold text-sm tracking-widest uppercase">
            Verification
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Company Information</h2>
          <p className="text-gray-600 text-lg">
            Transparent and verifiable corporate details for your confidence.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 animate-on-scroll">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="flex items-start gap-4 hover:bg-slate-50 p-2 rounded-xl transition-colors">
              <div className="mt-1 bg-gray-100 p-3 rounded-xl"><Building2 className="text-gray-700" size={24} /></div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Company Name</p>
                <p className="text-lg font-bold text-gray-900">JKSH United Private Limited</p>
              </div>
            </div>

            <div className="flex items-start gap-4 hover:bg-slate-50 p-2 rounded-xl transition-colors">
              <div className="mt-1 bg-gray-100 p-3 rounded-xl"><FileText className="text-gray-700" size={24} /></div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Company Type</p>
                <p className="text-lg font-bold text-gray-900">Private Limited Company</p>
              </div>
            </div>

            <div className="flex items-start gap-4 hover:bg-slate-50 p-2 rounded-xl transition-colors">
              <div className="mt-1 bg-gray-100 p-3 rounded-xl"><Landmark className="text-gray-700" size={24} /></div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Registered Under</p>
                <p className="text-lg font-bold text-gray-900">Ministry of Corporate Affairs (MCA), India</p>
              </div>
            </div>

            <div className="flex items-start gap-4 hover:bg-slate-50 p-2 rounded-xl transition-colors">
              <div className="mt-1 bg-gray-100 p-3 rounded-xl"><MapPin className="text-gray-700" size={24} /></div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Country</p>
                <p className="text-lg font-bold text-gray-900">India</p>
              </div>
            </div>

            <div className="flex items-start gap-4 md:col-span-2 hover:bg-slate-50 p-2 rounded-xl transition-colors">
              <div className="mt-1 bg-gray-100 p-3 rounded-xl"><MapPin className="text-gray-700" size={24} /></div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Registered Address</p>
                <p className="text-lg font-bold text-gray-900">Floor #4, Flat No. #406, Alluri Trade Center, Near KPHB Metro (Pillar #761), Hyderabad, Telangana — 500072</p>
              </div>
            </div>



          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyInfo;

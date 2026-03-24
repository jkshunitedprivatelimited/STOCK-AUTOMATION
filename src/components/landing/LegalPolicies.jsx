import React, { useState } from "react";
import { ShieldCheck, Lock, RotateCcw, ChevronDown, Scale, UserCheck, CreditCard, Fingerprint, Database, Share2, ShieldAlert, XCircle, PackageCheck, Clock, Truck } from "lucide-react";

const PolicySection = ({ icon: Icon, iconColor, iconBg, title, items, isOpen, onToggle }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-6 md:p-8 text-left cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={iconColor} size={28} />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">
          {title}
        </h3>
      </div>
      <ChevronDown
        size={24}
        className={`text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
    <div
      className={`transition-all duration-500 ease-in-out overflow-hidden ${
        isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="px-6 md:px-8 pb-8 space-y-5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-4 group/item">
            <div className="mt-1 bg-gray-50 p-2.5 rounded-lg flex-shrink-0">
              <item.icon className="text-gray-500" size={18} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 text-base mb-1">{item.title}</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LegalPolicies = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (idx) => setOpenIndex(openIndex === idx ? null : idx);

  const policies = [
    {
      icon: ShieldCheck,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      title: "Terms and Conditions",
      intro: "Welcome to the official partner portal of JKSH United Private Limited. By accessing this website and our brands, including T Vanamm and T Leaf, you agree to comply with the following terms:",
      items: [
        {
          icon: UserCheck,
          title: "Authorized Access",
          description:
            "This portal is strictly for the use of authorized Franchise Owners of JKSH United Private Limited. Sharing login credentials with unauthorized third parties is a violation of your franchise agreement and may result in account suspension.",
        },
        {
          icon: PackageCheck,
          title: "Order Placement",
          description:
            "All orders placed through the portal are considered firm commitments. Prices are subject to change based on market conditions, but the price at the time of order placement will be honored.",
        },
        {
          icon: CreditCard,
          title: "Payment Terms",
          description:
            "All payments for inventory and services must be made in full at the time of order via our integrated payment gateway. We accept payments only in Indian Rupees (INR).",
        },
        {
          icon: Scale,
          title: "Intellectual Property",
          description:
            "All brand names, logos (T Vanamm, T Leaf), and content on this site are the property of JKSH United Private Limited. Unauthorized use of these assets outside the scope of your franchise agreement is prohibited.",
        },
        {
          icon: Scale,
          title: "Governing Law",
          description:
            "These terms are governed by the laws of India, and any disputes will be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana.",
        },
      ],
    },
    {
      icon: Lock,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      title: "Privacy Policy",
      intro: 'JKSH United Private Limited ("we", "us", or "our") is committed to protecting the privacy of our franchise partners.',
      items: [
        {
          icon: Database,
          title: "Data Collection",
          description:
            "We collect basic contact information and login credentials necessary to manage your franchise account. We do not store sensitive financial data like credit card numbers or PAN/GST details directly on our servers; these are handled securely by our payment partner, Razorpay.",
        },
        {
          icon: Fingerprint,
          title: "Use of Data",
          description:
            "Your data is used solely for order processing, account management, and providing updates regarding your franchise operations.",
        },
        {
          icon: Share2,
          title: "Third-Party Sharing",
          description:
            "We do not sell or lease your data. We only share necessary information (such as your delivery address) with our logistics/shipping partners and our payment processor, Razorpay, to fulfill your orders.",
        },
        {
          icon: ShieldAlert,
          title: "Security",
          description:
            "We implement industry-standard security measures to protect your account from unauthorized access.",
        },
      ],
    },
    {
      icon: RotateCcw,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      title: "Refund and Cancellation Policy",
      intro: "At JKSH United Private Limited, we strive to ensure our franchise partners receive high-quality supplies and support.",
      items: [
        {
          icon: XCircle,
          title: "Cancellations",
          description:
            "Once an order is placed and payment is confirmed through the portal, the order cannot be cancelled or taken back, as logistics and inventory allocation begin immediately.",
        },
        {
          icon: PackageCheck,
          title: "Returns & Refunds",
          description:
            'We do not offer returns for "change of mind." However, if products are received in a damaged or defective condition, we will initiate a replacement or refund.',
        },
        {
          icon: ShieldCheck,
          title: "Claim Process",
          description:
            "To claim a refund or replacement for damaged goods, the franchise owner must provide proof (photos/videos of the damaged shipment) within 24 hours of delivery.",
        },
        {
          icon: Clock,
          title: "Refund Timeline",
          description:
            "Once a refund is approved, it will be processed back to the original payment method within 5-7 business days.",
        },
        {
          icon: Truck,
          title: "Shipping",
          description:
            "Standard delivery for all portal orders takes 2-3 business days.",
        },
      ],
    },
  ];

  return (
    <section id="legal-policies" className="py-24 bg-gray-50 relative">
      {/* Subtle top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-blue-400 to-amber-400 opacity-60" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14 animate-on-scroll">
          <div className="inline-block mb-4 border border-green-200 bg-green-50 px-3 py-1 rounded-full text-green-700 font-semibold text-sm tracking-widest uppercase">
            Legal
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Policies & Compliance
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Transparency and trust are the foundation of our franchise partnerships. Review our policies below.
          </p>
        </div>

        {/* Accordion Panels */}
        <div className="space-y-5">
          {policies.map((policy, idx) => (
            <div key={idx} className="animate-on-scroll">
              {/* Intro line shown above accordion when open */}
              <PolicySection
                icon={policy.icon}
                iconColor={policy.iconColor}
                iconBg={policy.iconBg}
                title={policy.title}
                items={[
                  { icon: policy.icon, title: "Overview", description: policy.intro },
                  ...policy.items,
                ]}
                isOpen={openIndex === idx}
                onToggle={() => toggle(idx)}
              />
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 text-center animate-on-scroll">
          <p className="text-sm text-gray-500">
            For any questions regarding our policies, please{" "}
            <a href="#contact" className="text-green-700 font-medium hover:underline">
              contact us
            </a>.
          </p>
        </div>
      </div>
    </section>
  );
};

export default LegalPolicies;

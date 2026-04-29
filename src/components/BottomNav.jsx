import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Package, BarChart3, User } from "lucide-react";
import { PRIMARY } from "../utils/theme";

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { id: "order", label: "Order", icon: <ShoppingBag size={20} />, path: "/stock-orders" },
        { id: "history", label: "History", icon: <Package size={20} />, path: "/franchise/invoices" },
        { id: "reports", label: "Reports", icon: <BarChart3 size={20} />, path: "/franchise/analytics" },
        { id: "profile", label: "Profile", icon: <User size={20} />, path: "/franchise/settings" },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 px-4 flex justify-between items-center z-50 pb-safe">
            {tabs.map((tab) => {
                const isActive = location.pathname === tab.path;
                return (
                    <button
                        key={tab.id}
                        onClick={() => navigate(tab.path)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${!isActive ? "text-slate-400 hover:text-slate-600" : ""}`}
                        style={isActive ? { color: PRIMARY, backgroundColor: PRIMARY + "1A" } : {}}
                    >
                        {tab.icon}
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? "opacity-100" : "opacity-70"}`}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default BottomNav;

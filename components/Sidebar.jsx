"use client";

import Image from "next/image";
import { LogOut, Menu, RefreshCw, ShieldCheck, UserRound, X } from "lucide-react";

export function Sidebar({ activeTab, open, session, status, tabs, onClose, onLogout, onRefresh, onSelectTab, onToggle }) {
  return (
    <>
      {open && <button className="sidebar-backdrop" type="button" onClick={onClose} />}
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="sidebar-header">
          <div className="brand-mark">
            <Image src="/wonspareparts-banner.png" alt="WONSPAREPARTS" width={2172} height={724} priority />
          </div>
          <button
            className="mobile-menu-button"
            type="button"
            onClick={onToggle}
            title={open ? "Close navigation" : "Open navigation"}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <div className="user-card">
          <div className="user-avatar">
            {session.role === "manager" ? <ShieldCheck size={20} /> : <UserRound size={20} />}
          </div>
          <div>
            <strong>{session.name}</strong>
            <span>{session.role === "manager" ? "Manager Interface" : "Sales Representative Interface"}</span>
          </div>
        </div>
        <nav className="tabs" aria-label="Main navigation">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "tab active" : "tab"}
                onClick={() => onSelectTab(tab.id)}
                title={tab.label}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sync-box">
          <span>{status}</span>
          <button className="icon-button" onClick={onRefresh} title="Refresh records">
            <RefreshCw size={17} />
          </button>
          <button className="icon-button" onClick={onLogout} title="Log out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}

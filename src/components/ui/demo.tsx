/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";
import React from "react";
import { ContainerScroll } from "@/src/components/ui/container-scroll-animation";
import { Award, ShieldCheck, Database, Layers, Sparkles } from "lucide-react";

export function HeroScrollDemo() {
  return (
    <div className="w-full relative">
      <ContainerScroll
        titleComponent={
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
              Interactive Builder Showcase
            </span>
            <h1 className="text-3xl md:text-5xl font-serif italic text-slate-950 mt-4 leading-tight">
              Design and issue with <br />
              <span className="text-4xl md:text-[5.5rem] font-sans tracking-tight font-extrabold not-italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 leading-none">
                Fluid Canvas Motion
              </span>
            </h1>
          </div>
        }
      >
        {/* White Theme Mockup of the Glint Platform Workspace */}
        <div className="w-full h-full bg-white flex flex-col justify-between p-6 md:p-8 font-sans select-none">
          {/* Mock Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Glint Workspace</h3>
                <p className="text-[9px] text-slate-400">Design Portal • Active Session</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Connected to Neon Cloud
              </span>
            </div>
          </div>

          {/* Mock Workspace Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 my-4 md:my-6 grow items-stretch overflow-hidden">
            {/* Sidebar Controls */}
            <div className="hidden md:flex md:col-span-4 border border-slate-100 bg-slate-50/50 rounded-xl p-4 flex-col justify-between">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Design Elements</p>
                <div className="space-y-2">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-between text-xs text-slate-700 hover:border-indigo-500 transition-colors">
                    <span className="font-medium">Recipient Name Field</span>
                    <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">Dynamic</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-between text-xs text-slate-700 hover:border-indigo-500 transition-colors">
                    <span className="font-medium">Program Title Field</span>
                    <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">Dynamic</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-between text-xs text-slate-700 hover:border-indigo-500 transition-colors">
                    <span className="font-medium">Cryptographic Seal</span>
                    <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-between text-xs text-slate-700 hover:border-indigo-500 transition-colors">
                    <span className="font-medium">Dynamic QR Code</span>
                    <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-600/5 border border-indigo-100 p-3 rounded-lg text-[10px] text-slate-500 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-indigo-900 block font-bold">Gemini Design Assistant:</strong>
                  Try prompting AI to create borders, fonts, or color themes instantly.
                </span>
              </div>
            </div>

            {/* Main Canvas Workspace */}
            <div className="col-span-12 md:col-span-8 border-2 border-dashed border-slate-200 rounded-xl p-3 md:p-4 flex items-center justify-center bg-slate-50/20 relative overflow-hidden group">
              {/* Simulated Certificate rendering */}
              <div className="w-full md:w-[90%] aspect-[1.414/1] bg-white border-[6px] border-indigo-600/80 rounded shadow-md p-4 flex flex-col justify-between transition-all duration-300 group-hover:scale-[1.02]">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-[8px] font-bold text-indigo-600 tracking-wider">OFFICIAL ACADEMIC CREDENTIAL</h4>
                    <p className="text-[6px] text-slate-400">VERIFIED LEDGER: CERT-2026-NEON</p>
                  </div>
                  <div className="w-10 h-4 border border-slate-200 bg-slate-50 rounded flex items-center justify-center text-[5px] font-bold">
                    ★ GLINT
                  </div>
                </div>

                <div className="text-center space-y-1.5">
                  <h5 className="text-[9px] font-bold tracking-widest text-slate-800">CERTIFICATE OF COMPLETION</h5>
                  <p className="text-[12px] font-serif italic font-bold text-slate-900 border-b border-dashed border-slate-300 w-32 mx-auto pb-0.5">
                    Jane Doe
                  </p>
                  <p className="text-[5.5px] text-slate-400 max-w-xs mx-auto">
                    for the successful completion of the intensive cloud infrastructure training program.
                  </p>
                </div>

                <div className="flex justify-between items-end border-t border-slate-100 pt-1.5">
                  <div>
                    <p className="text-[5px] text-slate-400 uppercase">DATE</p>
                    <p className="text-[6px] font-bold text-slate-700">2026-06-23</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[5.5px] font-bold text-slate-700">Thomas Kurian</p>
                    <p className="text-[4px] text-slate-400">Authority Signatory</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center p-0.5">
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://credentials.os/%23preview&color=0f172a" 
                        alt="Demo QR"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Stats Row */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[10px] text-slate-400">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-indigo-600" /> 100% Vector PDF Output</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Permanent Audit Ledger</span>
              <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-indigo-600" /> Neon Cloud Sync</span>
            </div>
            <span className="font-bold text-slate-700">Vite-React Engine</span>
          </div>
        </div>
      </ContainerScroll>
    </div>
  );
}

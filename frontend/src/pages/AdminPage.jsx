import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Database, FileText, Send, Trash2, Activity } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import api from '../services/api';

const AdminPage = () => {
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState('');
  const [classNum, setClassNum] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterNum, setChapterNum] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    setIsIngesting(true);
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('subject', subject);
    formData.append('classNum', classNum);
    formData.append('chapterTitle', chapterTitle);
    formData.append('chapterNum', chapterNum);

    try {
      await api.uploadPDF(formData);
      alert('Ingestion Pipeline Started Successfully!');
      setIsIngesting(false);
    } catch (err) {
      console.error(err);
      alert('Pipeline execution failed. Check console.');
      setIsIngesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-10 mt-1">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center gap-6 mb-12">
          <div className="p-4 bg-surface rounded-2xl border border-border">
            <Database className="text-secondary" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Admin <span className="text-gradient">Control Center</span></h1>
            <p className="text-muted text-lg uppercase tracking-widest mono mt-1">Neural_Map_Management_V1.1</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ingestion Form */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card"
          >
            <div className="flex items-center gap-3 mb-8">
              <Upload className="text-accent" />
              <h2 className="text-2xl font-bold">PDF Neural Ingestion</h2>
            </div>

            <form onSubmit={handleUpload} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="mono text-[10px] uppercase text-muted tracking-widest block ml-1">Subject_Identifier</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:border-accent outline-none" placeholder="Science" />
                </div>
                <div className="space-y-2">
                  <label className="mono text-[10px] uppercase text-muted tracking-widest block ml-1">Grade_Level</label>
                  <input value={classNum} onChange={e => setClassNum(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:border-accent outline-none" placeholder="6" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="mono text-[10px] uppercase text-muted tracking-widest block ml-1">Chapter_Index</label>
                  <input value={chapterNum} onChange={e => setChapterNum(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:border-accent outline-none" placeholder="1" />
                </div>
                <div className="space-y-2">
                  <label className="mono text-[10px] uppercase text-muted tracking-widest block ml-1">Reference_Title</label>
                  <input value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:border-accent outline-none" placeholder="Photosynthesis" />
                </div>
              </div>
              
              <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-accent transition-all cursor-pointer bg-surface/30">
                <input type="file" onChange={e => setFile(e.target.files[0])} className="hidden" id="pdf-upload" />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <FileText className="mx-auto mb-3 text-muted" size={40} />
                  <p className="text-sm font-bold text-accent">{file ? file.name : 'Select NCERT PDF for Deep Sync'}</p>
                  <p className="text-[10px] mono text-muted mt-2 uppercase">PDF_ONLY // MAX_50MB</p>
                </label>
              </div>

              <button 
                disabled={isIngesting || !file}
                className={`w-full py-5 rounded-xl font-bold transition-all text-lg flex justify-center items-center gap-3 ${isIngesting ? 'bg-surface text-muted cursor-wait' : 'btn-primary shadow-[0_0_20px_rgba(35,134,54,0.2)]'}`}
              >
                {isIngesting ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-muted border-t-transparent rounded-full" />
                    DEEP_SCAN_IN_PROGRESS...
                  </>
                ) : 'INITIATE_INGESTION'}
              </button>
            </form>
          </motion.div>

          {/* Diagnostics and Management */}
          <div className="space-y-8">
            <div className="glass-card">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="text-warning" />
                <h2 className="text-2xl font-bold">System Diagnostics</h2>
              </div>
              <p className="text-sm text-muted mb-8 italic">Verify neural bridge connectivity and audio downlink status.</p>
              
              <button 
                onClick={() => {
                  const v = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY);
                  v.start(import.meta.env.VITE_VAPI_ASSISTANT_ID);
                  setTimeout(() => {
                    v.send({ type: 'add-message', message: { role: 'assistant', content: 'Uplink established. All systems operational.' } });
                  }, 2000);
                }}
                className="w-full py-4 bg-background border border-border rounded-2xl flex items-center justify-center gap-3 hover:bg-surface transition-all font-bold group"
              >
                <div className="w-2 h-2 bg-success rounded-full group-hover:animate-ping" />
                TEST_VOICE_BRIDGE
              </button>
            </div>

            <div className="glass-card flex-1">
              <div className="flex items-center gap-3 mb-6">
                <Trash2 className="text-danger" />
                <h2 className="text-2xl font-bold">Active Indices</h2>
              </div>
              <div className="space-y-3">
                 <div className="flex justify-between items-center p-4 bg-background rounded-xl border border-border">
                    <div className="flex flex-col">
                       <span className="font-bold">Science Module</span>
                       <span className="mono text-[10px] text-muted uppercase">Grade_6 // Sync_Complete</span>
                    </div>
                    <button className="text-danger text-sm hover:underline font-bold uppercase tracking-widest">Delete</button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;

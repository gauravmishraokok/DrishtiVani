import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Database, FileText, Activity, CheckCircle, Trash2, Info, BookOpen, Edit2, Save, X } from 'lucide-react';
import api from '../services/api';
import { useGlobalVoice } from '../hooks/useGlobalVoice';

const AdminPage = () => {
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState('');
  const [classNum, setClassNum] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterNum, setChapterNum] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  useGlobalVoice(null, true);

  // Edit States
  const [editingSubId, setEditingSubId] = useState(null);
  const [tempSubName, setTempSubName] = useState('');
  const [tempClass, setTempClass] = useState('');

  const [editingChId, setEditingChId] = useState(null);
  const [tempChTitle, setTempChTitle] = useState('');
  const [tempChNum, setTempChNum] = useState('');

  const fetchCatalog = useCallback(async () => {
    try {
      setIsLoadingCatalog(true);
      const res = await api.getAdminCatalog();
      setCatalog(res.data || []);
    } catch (err) {
      console.error('Failed to fetch catalog', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setIsIngesting(true);
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('subject', subject);
    formData.append('classNum', classNum);
    formData.append('chapterTitle', chapterTitle);
    formData.append('chapterNum', chapterNum);
    try {
      await api.uploadPDF(formData);
      alert('Chapter uploaded and processed successfully!');
      setFile(null); setSubject(''); setChapterTitle(''); setChapterNum('');
      fetchCatalog();
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please try again.');
    } finally { setIsIngesting(false); }
  };

  const handleRemoveChapter = async (chapterId) => {
    if (!window.confirm('Are you sure you want to remove this chapter?')) return;
    try {
      await api.deleteChapter(chapterId);
      fetchCatalog();
    } catch (err) { console.error('Delete failed', err); }
  };

  const handleRemoveSubject = async (subjectId) => {
    if (!window.confirm('Are you sure? This will delete the entire subject and all its chapters!')) return;
    try {
      await api.deleteSubject(subjectId);
      fetchCatalog();
    } catch (err) { console.error('Delete subject failed', err); }
  };

  const startEditingSub = (sub) => {
    setEditingSubId(sub._id);
    setTempSubName(sub.name);
    setTempClass(sub.class_num.toString());
  };

  const saveSubEdit = async () => {
    try {
      await api.updateSubject(editingSubId, { name: tempSubName, classNum: parseInt(tempClass) });
      setEditingSubId(null);
      fetchCatalog();
    } catch (err) { alert('Failed to update subject'); }
  };

  const startEditingCh = (ch) => {
    setEditingChId(ch._id);
    setTempChTitle(ch.title);
    setTempChNum(ch.chapter_num.toString());
  };

  const saveChEdit = async () => {
    try {
      await api.updateChapter(editingChId, { title: tempChTitle, chapterNum: parseInt(tempChNum) });
      setEditingChId(null);
      fetchCatalog();
    } catch (err) { alert('Failed to update chapter'); }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F3] p-10 font-inter">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center gap-6 mb-12">
          <div className="h-16 w-16 bg-white rounded-2xl border border-[#E8D5C4] flex items-center justify-center shadow-sm">
            <Database className="text-[#F97316]" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[#1A1A1A] font-display">Admin Panel</h1>
            <p className="text-[#6B7280] text-lg font-medium">Manage study materials and curriculum</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-[#E8D5C4] rounded-2xl p-8 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-8"><Upload className="text-[#F97316]" /><h2 className="text-2xl font-bold text-[#1A1A1A]">Upload Study Material</h2></div>
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-xs font-bold text-[#9CA3AF] uppercase block ml-1">Subject</label><input value={subject} onChange={e => setSubject(e.target.value)} required className="w-full bg-[#FFF8F3] border border-[#E8D5C4] rounded-xl px-4 py-3 focus:border-[#F97316] outline-none" placeholder="e.g. Science" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-[#9CA3AF] uppercase block ml-1">Class</label><input value={classNum} onChange={e => setClassNum(e.target.value)} required className="w-full bg-[#FFF8F3] border border-[#E8D5C4] rounded-xl px-4 py-3 focus:border-[#F97316] outline-none" placeholder="e.g. 7" /></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-xs font-bold text-[#9CA3AF] uppercase block ml-1">Chapter Number</label><input value={chapterNum} onChange={e => setChapterNum(e.target.value)} required className="w-full bg-[#FFF8F3] border border-[#E8D5C4] rounded-xl px-4 py-3 focus:border-[#F97316] outline-none" placeholder="e.g. 1" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-[#9CA3AF] uppercase block ml-1">Chapter Title</label><input value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} required className="w-full bg-[#FFF8F3] border border-[#E8D5C4] rounded-xl px-4 py-3 focus:border-[#F97316] outline-none" placeholder="e.g. Photosynthesis" /></div>
              </div>
              <div className="border-2 border-dashed border-[#E8D5C4] rounded-2xl p-10 text-center hover:border-[#F97316] transition-all cursor-pointer bg-[#FFF8F3]/50 group relative">
                <input type="file" onChange={e => setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="application/pdf" />
                <FileText className="mx-auto mb-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors" size={48} />
                <p className="text-lg font-bold text-[#1A1A1A] truncate px-4">{file ? file.name : 'Drop PDF here or click to browse'}</p>
                <p className="text-xs text-[#9CA3AF] mt-2 font-medium">NCERT PDF files only</p>
              </div>
              <button disabled={isIngesting || !file} className={`w-full py-5 rounded-xl font-bold transition-all text-lg flex justify-center items-center gap-3 ${isIngesting ? 'bg-[#FFF1E6] text-[#F97316] cursor-wait' : 'btn-primary'}`}>{isIngesting ? <><Activity className="animate-spin" size={20} /> Processing...</> : 'Upload & Process'}</button>
            </form>
          </motion.div>

          <div className="space-y-6">
            <div className="bg-white border border-[#E8D5C4] rounded-2xl p-8 shadow-sm min-h-[500px]">
              <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-3"><CheckCircle className="text-[#F97316]" /><h2 className="text-2xl font-bold text-[#1A1A1A]">Uploaded Chapters</h2></div></div>
              {isLoadingCatalog ? <div className="flex flex-col items-center justify-center h-64 text-[#9CA3AF]"><Activity className="animate-spin mb-4" /><p className="text-xs font-bold uppercase">Loading Catalog...</p></div> : (
                <div className="space-y-10">
                  {catalog.map(sub => (
                    <div key={sub._id} className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        {editingSubId === sub._id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input value={tempSubName} onChange={e => setTempSubName(e.target.value)} className="bg-[#FFF8F3] border rounded px-2 py-1 font-bold text-sm w-1/2" />
                            <input value={tempClass} onChange={e => setTempClass(e.target.value)} className="bg-[#FFF8F3] border rounded px-2 py-1 font-bold text-sm w-16" />
                            <button onClick={saveSubEdit} className="text-[#16A34A] p-1"><Save size={16} /></button>
                            <button onClick={() => setEditingSubId(null)} className="text-[#9CA3AF] p-1"><X size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 group">
                            <BookOpen size={16} className="text-[#F97316]" />
                            <span className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">{sub.name} (Class {sub.class_num})</span>
                            <button onClick={() => startEditingSub(sub)} className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-[#F97316] transition-all"><Edit2 size={12} /></button>
                            <button onClick={() => handleRemoveSubject(sub._id)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all ml-2"><Trash2 size={12} /></button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {sub.chapters.map(ch => (
                          <div key={ch._id} className="flex justify-between items-center p-5 bg-[#FFF8F3] rounded-2xl border border-[#E8D5C4] hover:border-[#FED7AA] transition-all group">
                            {editingChId === ch._id ? (
                              <div className="flex items-center gap-3 flex-1">
                                <input value={tempChNum} onChange={e => setTempChNum(e.target.value)} className="bg-white border rounded px-2 py-1 font-bold text-sm w-12" />
                                <input value={tempChTitle} onChange={e => setTempChTitle(e.target.value)} className="bg-white border rounded px-2 py-1 font-bold text-sm flex-1" />
                                <button onClick={saveChEdit} className="text-[#16A34A] p-1"><Save size={18} /></button>
                                <button onClick={() => setEditingChId(null)} className="text-[#9CA3AF] p-1"><X size={18} /></button>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-col">
                                  <span className="font-bold text-[#1A1A1A]">Ch {ch.chapter_num}: {ch.title}</span>
                                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">{ch.total_chunks || 0} Sections</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => startEditingCh(ch)} className="text-[#9CA3AF] hover:text-[#F97316] p-2 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100"><Edit2 size={16} /></button>
                                  <button onClick={() => handleRemoveChapter(ch._id)} className="text-[#9CA3AF] hover:text-[#DC2626] p-2 hover:bg-white rounded-xl transition-all"><Trash2 size={18} /></button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {catalog.length === 0 && <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#E8D5C4] rounded-3xl opacity-50"><Info className="mb-2 text-[#9CA3AF]" /><p className="text-sm font-medium text-[#6B7280]">No study materials uploaded yet.</p></div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminPage;

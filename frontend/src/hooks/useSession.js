import { useState, useEffect } from 'react';
import api from '../services/api';

export const useSession = () => {
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const studentId = localStorage.getItem('studentId');
    if (studentId) {
      api.onboard({}).then(res => setStudent(res.data)).catch(() => {}); // mock load
    }
  }, []);

  const login = async (name) => {
    const res = await api.login(name);
    setStudent(res.data);
    localStorage.setItem('studentId', res.data._id);
    return res.data;
  };

  const logout = () => {
    setStudent(null);
    localStorage.removeItem('studentId');
  };

  return { student, login, logout };
};

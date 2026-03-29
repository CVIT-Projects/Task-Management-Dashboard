import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';
const TIME_ENTRIES_API = `${API_BASE}/api/time-entries`;

const TimerContext = createContext();

export const useTimer = () => useContext(TimerContext);

export const TimerProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [activeEntry, setActiveEntry] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // Bootstrap function to find if we left a timer running
  const fetchActiveTimer = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await axios.get(TIME_ENTRIES_API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // The active timer is the one with no endTime
      const runningEntry = Array.isArray(res.data)
        ? res.data.find(entry => entry.endTime === null)
        : null;
      setActiveEntry(runningEntry || null);
    } catch (error) {
      console.error('Failed to fetch active timers', error);
    }
  }, [token, user]);

  useEffect(() => {
    fetchActiveTimer();
  }, [fetchActiveTimer]);

  // The "Brain" Loop: Polling every 1 second
  useEffect(() => {
    let interval;
    if (activeEntry) {
      // Calculate elapsed based on real clock time, not just counting 1,2,3
      // This prevents the clock from getting desynced if the browser tab sleeps
      const startTimeMs = new Date(activeEntry.startTime).getTime();
      setElapsed(Math.floor((Date.now() - startTimeMs) / 1000));

      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeMs) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    
    return () => clearInterval(interval);
  }, [activeEntry]);

  const startTimer = async (taskId) => {
    try {
      const res = await axios.post(
        `${TIME_ENTRIES_API}/start`, 
        { taskId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // The backend creates the entry and also auto-closes any previous one.
      setActiveEntry(res.data.entry);
    } catch (error) {
      console.error('Failed to start timer', error);
      alert('Could not start timer. ' + (error.response?.data?.message || ''));
    }
  };

  const stopTimer = async () => {
    if (!activeEntry) return;
    try {
      await axios.patch(
        `${TIME_ENTRIES_API}/${activeEntry.id}/stop`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Nullify the active state, killing the ticking clock
      setActiveEntry(null);
      setElapsed(0);
    } catch (error) {
      console.error('Failed to stop timer', error);
      alert('Could not stop timer.');
    }
  };

  return (
    <TimerContext.Provider value={{ activeEntry, elapsed, startTimer, stopTimer }}>
      {children}
    </TimerContext.Provider>
  );
};

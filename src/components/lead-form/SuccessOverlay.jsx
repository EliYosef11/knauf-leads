import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function SuccessOverlay({ countdown }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200 }}
        className="text-center px-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', damping: 12 }}
          className="w-24 h-24 mx-auto rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/30"
        >
          <Check className="w-12 h-12 text-primary-foreground" strokeWidth={3} />
        </motion.div>
        <h2 className="mt-8 text-4xl font-display font-bold text-foreground">
          הליד נשמר בהצלחה
        </h2>
        <p className="mt-3 text-lg text-muted-foreground">
          תודה! מיד חוזרים לטופס לקליטת הליד הבא
        </p>
        <div className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>טוען מחדש בעוד {countdown} שניות…</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
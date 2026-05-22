import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';

interface FeedbackFormProps {
  orderId: string;
}

export default function FeedbackForm({ orderId }: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a rating.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium text-center">
        Thank you for your feedback!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border border-gray-100 rounded-xl space-y-3 shadow-inner">
      <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest text-center">Rate your experience</h4>
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 transition-all active:scale-95"
          >
            <Star 
              className={`w-6 h-6 transition-colors ${
                star <= (hoverRating || rating) 
                  ? 'fill-brand-orange text-brand-orange' 
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was your meal? (optional)"
        className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-orange"
        rows={2}
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 bg-brand-green text-white rounded-lg text-xs font-bold hover:bg-brand-green-hover transition-all disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
}

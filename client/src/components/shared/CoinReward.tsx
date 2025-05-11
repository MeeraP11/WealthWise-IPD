import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface CoinRewardProps {
  amount?: number;
  message?: string;
}

export function CoinReward({ amount, message }: CoinRewardProps) {
  const [show, setShow] = useState(false);
  const [rewardAmount, setRewardAmount] = useState<number | undefined>(undefined);
  const [rewardMessage, setRewardMessage] = useState<string | undefined>(undefined);
  
  // Store coins earned event in a custom event
  useEffect(() => {
    const handleCoinsEarned = (event: CustomEvent<{ amount: number, message: string }>) => {
      const { amount, message } = event.detail;
      setRewardAmount(amount);
      setRewardMessage(message);
      setShow(true);
      
      // Auto hide after 5 seconds
      setTimeout(() => {
        setShow(false);
      }, 5000);
    };
    
    // Add event listener
    window.addEventListener('coinsEarned' as any, handleCoinsEarned as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('coinsEarned' as any, handleCoinsEarned as EventListener);
    };
  }, []);
  
  // Show notification when props change
  useEffect(() => {
    if (amount) {
      setRewardAmount(amount);
      setRewardMessage(message);
      setShow(true);
      
      // Auto hide after 5 seconds
      setTimeout(() => {
        setShow(false);
      }, 5000);
    }
  }, [amount, message]);
  
  if (!show) return null;
  
  // Helper function to dispatch the event
  CoinReward.showReward = (amount: number, message: string) => {
    const event = new CustomEvent('coinsEarned', {
      detail: { amount, message }
    });
    window.dispatchEvent(event);
  };
  
  return createPortal(
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border-l-4 border-warning-DEFAULT max-w-xs z-50 animate-in slide-in-from-right">
      <div className="flex">
        <div className="flex-shrink-0 mr-3">
          <i className="fas fa-coins text-xl text-warning-DEFAULT"></i>
        </div>
        <div>
          <h4 className="font-bold text-neutral-800">Coins Earned!</h4>
          <p className="text-sm text-neutral-600 mt-1">
            {rewardMessage || `You earned ${rewardAmount} coins!`}
          </p>
          <div className="mt-2 flex justify-end">
            <button 
              className="text-sm text-neutral-500 hover:text-neutral-700"
              onClick={() => setShow(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Add static method
CoinReward.showReward = (amount: number, message: string) => {
  const event = new CustomEvent('coinsEarned', {
    detail: { amount, message }
  });
  window.dispatchEvent(event);
};

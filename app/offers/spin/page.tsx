'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { SPIN_PRIZES, SpinPrize } from '@/lib/types';

function SpinWheelContent() {
  const searchParams = useSearchParams();
  const offerLeadId = searchParams.get('id');
  const salesRepId = searchParams.get('rep');
  const alreadyPlayed = searchParams.get('played') === 'true';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(alreadyPlayed);
  const [result, setResult] = useState<{
    prize: string;
    couponCode: string;
    isTryAgain: boolean;
    customerName?: string;
    customerPhone?: string;
    locality?: string;
    whatsappNumber?: string;
  } | null>(null);

  // Dynamic settings from admin
  const [prizes, setPrizes] = useState<SpinPrize[]>(SPIN_PRIZES);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState('');
  const animationRef = useRef<number | null>(null);

  const segmentAngle = 360 / prizes.length;

  // Fetch settings from organization
  useEffect(() => {
    const fetchSettings = async () => {
      if (!salesRepId) {
        setSettingsLoaded(true);
        return;
      }

      try {
        const response = await fetch(`/api/offers/settings/${salesRepId}`);
        const data = await response.json();

        if (data.success && data.data) {
          if (data.data.prizes && data.data.prizes.length > 0) {
            setPrizes(data.data.prizes);
          }
          if (data.data.whatsappNumber) {
            setWhatsappNumber(data.data.whatsappNumber);
          }
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setSettingsLoaded(true);
      }
    };

    fetchSettings();
  }, [salesRepId]);

  // Draw the wheel
  const drawWheel = useCallback((currentRotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas || prizes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const currentSegmentAngle = 360 / prizes.length;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw segments
    prizes.forEach((prize, index) => {
      const startAngle = (index * currentSegmentAngle - 90 + currentRotation) * (Math.PI / 180);
      const endAngle = ((index + 1) * currentSegmentAngle - 90 + currentRotation) * (Math.PI / 180);

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + (currentSegmentAngle * Math.PI) / 360);
      ctx.textAlign = 'right';
      ctx.fillStyle = prize.textColor || '#ffffff';
      ctx.font = 'bold 11px Arial';

      // Split text for longer labels
      const text = prize.label;

      if (text.length > 15) {
        const words = text.split(' ');
        let line1 = '';
        let line2 = '';

        words.forEach((word, i) => {
          if (i < Math.ceil(words.length / 2)) {
            line1 += word + ' ';
          } else {
            line2 += word + ' ';
          }
        });

        ctx.fillText(line1.trim(), radius - 20, -4);
        ctx.fillText(line2.trim(), radius - 20, 10);
      } else {
        ctx.fillText(text, radius - 20, 4);
      }

      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw SPIN text in center
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', centerX, centerY);
  }, [prizes]);

  // Initial draw and redraw when prizes change
  useEffect(() => {
    if (settingsLoaded) {
      drawWheel(rotation);
    }
  }, [drawWheel, rotation, settingsLoaded]);

  // Fetch existing result if already played
  useEffect(() => {
    if (alreadyPlayed && offerLeadId) {
      setHasSpun(true);
    }
  }, [alreadyPlayed, offerLeadId]);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 50,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.2, 0.8),
          y: randomInRange(0.2, 0.6),
        },
        colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DFE6E9'],
      });
    }, 250);
  };

  const spin = async () => {
    if (isSpinning || hasSpun || !offerLeadId) return;

    setIsSpinning(true);
    setError('');

    try {
      // Call API to get result (determined server-side)
      const response = await fetch('/api/offers/spin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ offerLeadId }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Something went wrong');
        setIsSpinning(false);
        return;
      }

      const { prizeIndex, prize, couponCode, isTryAgain, customerName, customerPhone, locality, whatsappNumber: returnedWhatsapp } = data.data;

      // Update WhatsApp number from response if available
      if (returnedWhatsapp) {
        setWhatsappNumber(returnedWhatsapp);
      }

      // Calculate final rotation to land on the prize
      const currentSegmentAngle = 360 / prizes.length;
      const targetAngle = 360 - (prizeIndex * currentSegmentAngle + currentSegmentAngle / 2);
      const spins = 5; // Number of full rotations
      const finalRotation = rotation + 360 * spins + targetAngle - (rotation % 360);

      // Animate the spin
      const startRotation = rotation;
      const totalRotation = finalRotation - startRotation;
      const duration = 5000; // 5 seconds
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out cubic)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRotation = startRotation + totalRotation * easeOut;

        setRotation(currentRotation);
        drawWheel(currentRotation);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete
          setIsSpinning(false);
          setHasSpun(true);
          setResult({
            prize,
            couponCode,
            isTryAgain,
            customerName,
            customerPhone,
            locality,
            whatsappNumber: returnedWhatsapp || whatsappNumber,
          });

          if (!isTryAgain) {
            triggerConfetti();
          }
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    } catch (err) {
      console.error('Spin error:', err);
      setError('Network error. Please try again.');
      setIsSpinning(false);
    }
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const shareOnWhatsApp = () => {
    if (!result || result.isTryAgain) return;

    // Get the WhatsApp number to use (from result or state)
    const targetNumber = result.whatsappNumber || whatsappNumber;

    // Message for the store/sales rep with customer details
    const message = `🎉 *New Offer Winner!*

👤 *Customer:* ${result.customerName || 'Unknown'}
📱 *Phone:* ${result.customerPhone || 'N/A'}
📍 *Locality:* ${result.locality || 'N/A'}

🏆 *Prize Won:* ${result.prize}
🎟️ *Coupon Code:* ${result.couponCode}

_Customer claimed this offer via QR code spin wheel._`;

    // If we have a specific number, send directly to it
    // Otherwise, let the user choose
    const url = targetNumber
      ? `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };

  if (!offerLeadId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-600">Please scan the QR code again to access the offers.</p>
        </div>
      </div>
    );
  }

  if (!settingsLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* Result Display */}
        {result && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-bounce-in">
              {result.isTryAgain ? (
                <>
                  <div className="text-6xl mb-4">😔</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Better Luck Next Time!</h2>
                  <p className="text-gray-600 mb-6">Don't worry, visit us for more exciting offers!</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Congratulations!</h2>
                  <p className="text-gray-600 mb-4">You won:</p>
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 mb-4">
                    <p className="text-2xl font-bold text-purple-700">{result.prize}</p>
                  </div>
                  <div className="bg-gray-100 rounded-xl p-4 mb-6">
                    <p className="text-sm text-gray-500 mb-1">Your Coupon Code</p>
                    <p className="text-3xl font-mono font-bold text-gray-900 tracking-wider">
                      {result.couponCode}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Valid for 30 days</p>
                  </div>
                  <button
                    onClick={shareOnWhatsApp}
                    className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg py-3 px-4 font-semibold flex items-center justify-center space-x-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span>Share on WhatsApp</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setResult(null)}
                className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            🎰 Spin to Win!
          </h1>
          <p className="text-white/90">
            {hasSpun && !result ? 'You have already spun the wheel!' : 'Tap the wheel to spin and win amazing prizes!'}
          </p>
        </div>

        {/* Wheel Container */}
        <div className="relative mb-8">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-white drop-shadow-lg" />
          </div>

          {/* Wheel */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className={`rounded-full shadow-2xl ${!isSpinning && !hasSpun ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
              onClick={spin}
            />

            {/* Glow effect when not spinning */}
            {!isSpinning && !hasSpun && (
              <div className="absolute inset-0 rounded-full animate-pulse-glow pointer-events-none" />
            )}
          </div>
        </div>

        {/* Spin Button */}
        {!hasSpun && (
          <button
            onClick={spin}
            disabled={isSpinning}
            className={`px-12 py-4 rounded-full font-bold text-xl transition-all transform ${
              isSpinning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-white text-purple-600 hover:scale-110 hover:shadow-xl active:scale-95'
            } shadow-lg`}
          >
            {isSpinning ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Spinning...
              </span>
            ) : (
              'SPIN NOW!'
            )}
          </button>
        )}

        {/* Already Spun Message */}
        {hasSpun && !result && (
          <div className="bg-white/20 backdrop-blur rounded-xl p-6 text-center max-w-md">
            <p className="text-white text-lg">
              You've already claimed your offer from this campaign. Thank you for participating!
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Prize Legend */}
        <div className="mt-8 bg-white/10 backdrop-blur rounded-xl p-4 max-w-md w-full">
          <h3 className="text-white font-semibold text-center mb-3">Prizes You Can Win</h3>
          <div className="grid grid-cols-2 gap-2">
            {prizes.filter(p => !p.label.toLowerCase().includes('try again')).map((prize, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 text-white/90 text-sm"
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: prize.color }}
                />
                <span className="truncate">{prize.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom styles */}
      <style jsx>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 255, 255, 0.6);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function SpinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <SpinWheelContent />
    </Suspense>
  );
}

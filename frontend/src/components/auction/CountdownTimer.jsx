import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ targetDate, onEnd }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        h: Math.floor((difference / (1000 * 60 * 60))),
        m: Math.floor((difference / 1000 / 60) % 60),
        s: Math.floor((difference / 1000) % 60),
      };
    } else {
      timeLeft = { h: 0, m: 0, s: 0 };
    }

    return timeLeft;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining.h === 0 && remaining.m === 0 && remaining.s === 0) {
        clearInterval(timer);
        if (onEnd) onEnd();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const format = (n) => n.toString().padStart(2, '0');

  // Color logic
  const diff = +new Date(targetDate) - +new Date();
  const isUrgent = diff < 600000; // 10 mins
  const isCritical = diff < 120000; // 2 mins

  const textColor = isCritical ? 'text-accent-red' : isUrgent ? 'text-accent-amber' : 'text-accent-green';

  return (
    <div className={`font-mono text-4xl font-bold ${textColor}`}>
      {format(timeLeft.h)}:{format(timeLeft.m)}:{format(timeLeft.s)}
    </div>
  );
};

export default CountdownTimer;

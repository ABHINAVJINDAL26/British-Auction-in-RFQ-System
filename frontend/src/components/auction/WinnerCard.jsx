import React, { useState, useEffect } from 'react';
import { Trophy, X, Award, TrendingDown, CheckCircle, XCircle, Star, AlertTriangle } from 'lucide-react';
import useAuctionStore from '../../store/auctionStore';

const fmt = (n) => n != null ? '₹' + new Intl.NumberFormat('en-IN').format(n) : '—';

// Phase 1: Suspense screen (2s)
const SuspensePhase = () => (
  <div className="flex flex-col items-center justify-center py-12 gap-6 animate-fade-in">
    <div className="relative w-20 h-20">
      <div className="absolute inset-0 rounded-full border-4 border-white/10" />
      <div className="absolute inset-0 rounded-full border-4 border-t-accent-amber border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      <div className="absolute inset-3 rounded-full bg-accent-amber/10 flex items-center justify-center">
        <Trophy className="w-6 h-6 text-accent-amber animate-pulse" />
      </div>
    </div>
    <div className="text-center">
      <p className="text-white font-bold text-lg mb-1">Auction Closed</p>
      <p className="text-text-muted text-sm animate-pulse">Calculating final results...</p>
    </div>
    <div className="flex gap-1">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full bg-accent-amber/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
      ))}
    </div>
  </div>
);

// Buyer Winner Card
const BuyerCard = ({ result }) => (
  <div className="animate-fade-in">
    <div className="flex items-center justify-center mb-6">
      <div className="w-14 h-14 rounded-full bg-accent-green/20 border border-accent-green/30 flex items-center justify-center mr-4">
        <Award className="w-7 h-7 text-accent-green" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">Auction Closed</h2>
        <p className="text-text-muted text-sm">{result.rfqName} · Ref: {result.referenceId}</p>
      </div>
    </div>

    {result.closeType === 'FORCE_CLOSED' && (
      <div className="mb-4 flex items-center gap-2 bg-accent-red/10 border border-accent-red/20 rounded-lg px-4 py-2 text-accent-red text-xs font-bold">
        <AlertTriangle className="w-4 h-4" /> Closed at Forced Deadline (Hard Cap)
      </div>
    )}

    {result.rankings.length === 0 ? (
      <div className="text-center py-8 text-text-muted italic">No bids received. Auction closed without a winner.</div>
    ) : (
      <>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Bids', val: result.totalBids },
            { label: 'Extensions', val: result.extensionCount },
            { label: 'Participants', val: result.rankings.length },
          ].map(({ label, val }) => (
            <div key={label} className="bg-bg-elevated rounded-lg p-3 text-center border border-border-color">
              <p className="text-xl font-bold text-white font-mono">{val}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>

        {/* Rankings */}
        <div className="space-y-2 mb-6">
          {result.rankings.slice(0, 5).map((r, i) => (
            <div key={r.supplierId}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all
                ${i === 0 ? 'bg-accent-green/10 border-accent-green/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-bg-elevated border-border-color'}`}
              style={{ animationDelay: `${i * 80}ms` }}>
              <span className="text-lg w-8 text-center shrink-0">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `L${i + 1}`}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${i === 0 ? 'text-accent-green' : 'text-white'}`}>
                  {r.supplierName} {i === 0 && <Star className="inline w-3 h-3 mb-0.5 ml-1 fill-accent-green" />}
                </p>
                <p className="text-text-muted text-xs">{r.carrierName} · {r.transitTime}d transit</p>
              </div>
              <p className={`font-mono font-bold text-sm shrink-0 ${i === 0 ? 'text-accent-green' : 'text-text-primary'}`}>
                {fmt(r.totalCharges)}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-text-muted mb-5">
          Winner: <span className="text-white font-bold">{result.winner?.supplierName}</span> at <span className="text-accent-green font-bold font-mono">{fmt(result.winner?.totalCharges)}</span>
        </p>
      </>
    )}
  </div>
);

// Winner Supplier Card
const WinnerSupplierCard = ({ result, myRank }) => (
  <div className="animate-fade-in text-center">
    <div className="relative mb-6">
      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-accent-amber/30 to-accent-green/20 border-2 border-accent-amber/50 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.3)]">
        <Trophy className="w-12 h-12 text-accent-amber" />
      </div>
      <div className="absolute -top-1 -right-1 left-1/2 ml-8 w-8 h-8 bg-accent-green rounded-full flex items-center justify-center border-2 border-bg-card">
        <Star className="w-4 h-4 text-white fill-white" />
      </div>
    </div>
    <h2 className="text-2xl font-bold text-white mb-1">Congratulations! 🎉</h2>
    <p className="text-accent-amber font-semibold mb-6">You won this auction!</p>

    <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-5 mb-6 text-left space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">RFQ</span>
        <span className="text-white font-bold">{result.referenceId}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">Your Bid</span>
        <span className="text-accent-green font-bold font-mono text-lg">{fmt(myRank?.totalCharges)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">Your Rank</span>
        <span className="text-white font-bold">🥇 L1</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">Carrier</span>
        <span className="text-white font-semibold">{myRank?.carrierName}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">Transit</span>
        <span className="text-white font-semibold">{myRank?.transitTime} days</span>
      </div>
    </div>

    <p className="text-xs text-text-muted">Await notification from the buyer regarding award confirmation.</p>
  </div>
);

// Loser Supplier Card
const LoserSupplierCard = ({ result, myRank }) => (
  <div className="animate-fade-in text-center">
    <div className="w-20 h-20 mx-auto rounded-full bg-bg-elevated border border-border-color flex items-center justify-center mb-5">
      <TrendingDown className="w-8 h-8 text-text-muted" />
    </div>
    <h2 className="text-xl font-bold text-white mb-1">Auction Closed</h2>
    <p className="text-text-muted text-sm mb-6">{result.referenceId}</p>

    <div className="bg-bg-elevated border border-border-color rounded-xl p-5 mb-6 text-left space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">Your Rank</span>
        <span className="text-white font-bold">L{myRank?.rank}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">Your Bid</span>
        <span className="text-white font-mono font-bold">{fmt(myRank?.totalCharges)}</span>
      </div>
      <div className="border-t border-border-color pt-3 flex justify-between text-sm">
        <span className="text-text-muted">Winner's Bid (L1)</span>
        <span className="text-accent-green font-mono font-bold">{fmt(result.winner?.totalCharges)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">Difference</span>
        <span className="text-accent-red font-mono font-bold">
          +{fmt((myRank?.totalCharges || 0) - (result.winner?.totalCharges || 0))}
        </span>
      </div>
    </div>

    <p className="text-xs text-text-muted">Thank you for participating. Better luck next time!</p>
  </div>
);

// No-bid card for supplier who didn't bid
const NoBidCard = ({ result }) => (
  <div className="animate-fade-in text-center">
    <div className="w-20 h-20 mx-auto rounded-full bg-bg-elevated border border-border-color flex items-center justify-center mb-5">
      <Trophy className="w-8 h-8 text-text-muted" />
    </div>
    <h2 className="text-xl font-bold text-white mb-1">Auction Closed</h2>
    <p className="text-text-muted text-sm mb-6">{result.referenceId}</p>
    {result.winner && (
      <div className="bg-bg-elevated border border-border-color rounded-xl p-5 mb-6 text-left space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Winner</span>
          <span className="text-white font-bold">{result.winner.supplierName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Winning Bid</span>
          <span className="text-accent-green font-mono font-bold">{fmt(result.winner.totalCharges)}</span>
        </div>
      </div>
    )}
  </div>
);

const WinnerCard = () => {
  const { auctionResult, clearAuctionResult, user } = useAuctionStore();
  const [phase, setPhase] = useState('suspense'); // suspense | reveal

  useEffect(() => {
    if (!auctionResult) return;
    setPhase('suspense');
    const timer = setTimeout(() => setPhase('reveal'), 2500);
    return () => clearTimeout(timer);
  }, [auctionResult]);

  if (!auctionResult) return null;

  const isBuyer = user?.role === 'BUYER';
  const myRank = auctionResult.rankings?.find(r => r.supplierId === user?.id);
  const isWinner = myRank?.rank === 1;

  let cardContent;
  if (phase === 'suspense') {
    cardContent = <SuspensePhase />;
  } else if (isBuyer) {
    cardContent = <BuyerCard result={auctionResult} />;
  } else if (!myRank) {
    cardContent = <NoBidCard result={auctionResult} />;
  } else if (isWinner) {
    cardContent = <WinnerSupplierCard result={auctionResult} myRank={myRank} />;
  } else {
    cardContent = <LoserSupplierCard result={auctionResult} myRank={myRank} />;
  }

  return (
    <div className="fixed inset-0 bg-bg-primary/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="relative bg-bg-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
        {/* Decorative top border */}
        <div className={`h-1 w-full ${phase === 'reveal' && isWinner ? 'bg-gradient-to-r from-accent-amber via-accent-green to-accent-amber' : 'bg-gradient-to-r from-accent-blue via-accent-green to-accent-blue'}`} />

        {/* Close button */}
        <button
          onClick={clearAuctionResult}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-bg-elevated hover:bg-bg-primary flex items-center justify-center text-text-muted hover:text-white transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {cardContent}

          {/* Footer Actions */}
          {phase === 'reveal' && (
            <div className="mt-4 flex gap-3 animate-fade-in">
              <button
                onClick={clearAuctionResult}
                className="flex-1 py-3 px-4 bg-bg-elevated hover:bg-bg-primary border border-border-color rounded-xl text-sm font-bold text-text-muted hover:text-white transition-all active:scale-95"
              >
                View Full Result
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WinnerCard;

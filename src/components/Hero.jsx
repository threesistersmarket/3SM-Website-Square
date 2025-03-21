import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IoPlay, IoPeople } from 'react-icons/io5';
import FoodIllustration from './FoodIllustration';
import VideoModal from './VideoModal';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function Hero() {
  const location = useLocation();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);


 useEffect(() => {
  const fetchMemberCount = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("member_count")
        .single();
      if (error) throw error;

      // Round down to nearest whole number before displaying
      animateCount(Math.floor(data?.member_count || 0));
    } catch (err) {
      console.error("Failed to fetch member count:", err);
    }
  };

  fetchMemberCount();
}, []);


  const animateCount = (targetCount) => {
    const duration = 2000;
    const steps = 60;
    const stepValue = targetCount / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= targetCount) {
        setMemberCount(targetCount);
        clearInterval(timer);
      } else {
        setMemberCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className="relative overflow-hidden px-[5%] py-16 md:py-24 lg:py-28">
      <div 
        className="absolute inset-0 w-full h-[120%] -top-[10%]"
        style={{
          backgroundImage: `url('https://jaytxitcypjelvxzcaif.supabase.co/storage/v1/object/public/media//Grocery%20Store.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `translateY(${scrollPosition * 0.15}px)`,
          transition: 'transform 0.1s linear',
          willChange: 'transform'
        }}
      />
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="container relative">
        <div className="grid grid-cols-1 gap-x-20 gap-y-12 md:gap-y-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="mb-5 text-6xl font-bold md:text-7xl lg:text-8xl text-white">
              Three Sisters Market
            </h1>
            <h2 className="mb-4 text-3xl font-semibold md:text-4xl lg:text-5xl text-white">
              Building a Community-Driven Co-op
            </h2>

            <div className="mb-6 bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-sm inline-flex items-center gap-6 border-t-4 border-accent-3">
              <IoPeople className="w-12 h-12 text-accent-3" />
              <div>
                <div className="text-4xl font-bold text-accent-3">{memberCount.toLocaleString()}</div>
                <div className="text-lg font-medium text-gray-900">Growing Community</div>
                <div className="text-sm text-gray-500">Member-Owners and Counting</div>
              </div>
            </div>

            <p className="md:text-md bg-white/90 backdrop-blur-sm p-6 rounded-lg text-text-primary">
              Welcome to Three Sisters Market, where community and nourishment thrive.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to="/ownership" className="px-6 py-3 bg-background-alternative text-text-alternative border border-border-primary rounded-lg">Join</Link>
              <Link to="/coop-education" className="px-6 py-3 bg-transparent text-white border border-white rounded-lg hover:bg-white hover:text-text-primary">Learn More</Link>
            </div>
          </div>
          <div>
            <div className="relative group border-4 border-white/80">
              <img src="https://jaytxitcypjelvxzcaif.supabase.co/storage/v1/object/public/media//West%20Blvd%20Coalition%20Fest-29%20(1).jpg" alt="Video thumbnail" className="w-full aspect-video object-cover" />
              <button onClick={() => setIsVideoModalOpen(true)} className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <IoPlay className="w-10 h-10 text-accent-3" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      <VideoModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} />
    </section>
  );
}

export default Hero;

import React from 'react';
import useViewportWidth from '@/hooks/useViewportWidth';
import OracleSphere from '@/components/OracleSphere';

// Onboarding and the main Oracle share the same approved artwork.
export default function OracleOrb({ state = 'idle', size = 215 }) {
  const vw = useViewportWidth();
  const effective = vw < 768 ? Math.min(size, Math.round(vw * .6)) : size;
  return <OracleSphere state={state} size={effective / 1.55} />;
}
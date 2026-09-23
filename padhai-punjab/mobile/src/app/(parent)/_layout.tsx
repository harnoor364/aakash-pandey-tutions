import React from 'react';
import { RoleTabs } from '@/components/TabHeader';

export default function ParentTabs() {
  return (
    <RoleTabs
      role="parent"
      tabs={[
        { name: 'index', title: 'Find Tutors', icon: 'search-outline' },
        { name: 'classes', title: '1-Hour Classes', icon: 'time-outline' },
        { name: 'saved', title: 'Saved', icon: 'heart-outline' },
        { name: 'my-tutors', title: 'My Tutors', icon: 'ribbon-outline' },
      ]}
    />
  );
}

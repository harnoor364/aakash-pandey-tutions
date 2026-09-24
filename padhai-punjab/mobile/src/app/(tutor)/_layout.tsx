import React from 'react';
import { RoleTabs } from '@/components/TabHeader';

export default function TutorTabs() {
  return (
    <RoleTabs
      role="tutor"
      tabs={[
        { name: 'index', title: 'Demos', icon: 'mail-outline' },
        { name: 'lessons', title: 'Classes', icon: 'time-outline' },
        { name: 'students', title: 'Students', icon: 'people-outline' },
        { name: 'my-reviews', title: 'Reviews', icon: 'star-outline' },
        { name: 'safety', title: 'Safety', icon: 'shield-checkmark-outline' },
        { name: 'profile', title: 'Profile', icon: 'person-outline' },
      ]}
    />
  );
}

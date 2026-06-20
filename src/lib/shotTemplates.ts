export interface ShotTemplateItem {
  title: string;
  category: string;
  required: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  description?: string;
}

export const SHOT_TEMPLATES: Record<string, { label: string; description: string; shots: ShotTemplateItem[] }> = {
  restaurant: {
    label: 'Restaurant / Food',
    description: 'Full shot list for restaurants, cafes, and food businesses',
    shots: [
      { title: 'Main dish — close-up', category: 'Food', required: true, priority: 'HIGH', description: 'Close-up shot highlighting texture and detail' },
      { title: 'Main dish — top view', category: 'Food', required: true, priority: 'HIGH', description: 'Flat lay overhead shot' },
      { title: 'Detail / texture shot', category: 'Detail Shot', required: true, priority: 'HIGH', description: 'Macro or close-up of food texture, steam, etc.' },
      { title: 'Ingredient shot', category: 'Food', required: false, priority: 'MEDIUM', description: 'Raw ingredients arranged for presentation' },
      { title: 'Preparation / cooking process', category: 'Behind the Scenes', required: false, priority: 'MEDIUM', description: 'Chef or staff actively preparing food' },
      { title: 'Chef / staff action shot', category: 'Staff', required: false, priority: 'MEDIUM', description: 'Portrait or action shot of kitchen staff' },
      { title: 'Restaurant interior — wide angle', category: 'Interior', required: true, priority: 'HIGH', description: 'Wide establishing shot of dining area' },
      { title: 'Table setup detail', category: 'Detail Shot', required: false, priority: 'LOW', description: 'Plates, cutlery, decorations detail' },
      { title: 'Restaurant exterior / facade', category: 'Exterior', required: false, priority: 'MEDIUM', description: 'Storefront or entrance shot' },
      { title: 'Client logo / signage shot', category: 'Detail Shot', required: false, priority: 'LOW', description: 'Logo, sign, or branding visible in frame' },
      { title: 'Behind the scenes short video', category: 'Behind the Scenes', required: false, priority: 'MEDIUM', description: 'Short video clip for stories/reels B-roll' },
      { title: 'Vertical reel clips', category: 'Reel', required: true, priority: 'HIGH', description: 'Multiple vertical clips for Instagram/TikTok reels' },
      { title: 'Story clips for Instagram', category: 'Story', required: false, priority: 'MEDIUM', description: 'Vertical story-format clips and photos' },
    ],
  },
  product: {
    label: 'Product Photography',
    description: 'For e-commerce, packaging, and product showcase',
    shots: [
      { title: 'Product — clean white background', category: 'Product', required: true, priority: 'HIGH', description: 'Standard white background product shot' },
      { title: 'Product — hero / lifestyle shot', category: 'Lifestyle', required: true, priority: 'HIGH', description: 'Product in a styled context' },
      { title: 'Product — detail / texture close-up', category: 'Detail Shot', required: true, priority: 'HIGH', description: 'Close-up of product material or finish' },
      { title: 'Product — multiple angles', category: 'Product', required: true, priority: 'HIGH', description: 'Front, side, back views' },
      { title: 'Product — packaging shot', category: 'Product', required: false, priority: 'MEDIUM', description: 'Product inside packaging or box' },
      { title: 'Product — variants / color range', category: 'Product', required: false, priority: 'MEDIUM', description: 'All color/size variants together' },
      { title: 'Product in use / lifestyle', category: 'Lifestyle', required: false, priority: 'MEDIUM', description: 'Product being used naturally' },
      { title: 'Vertical reel clips', category: 'Reel', required: true, priority: 'HIGH', description: 'Reel-style video clips of product' },
      { title: 'Story clips', category: 'Story', required: false, priority: 'LOW' },
    ],
  },
  factory: {
    label: 'Factory / Manufacturing',
    description: 'Industrial and manufacturing facility shoots',
    shots: [
      { title: 'Factory exterior — wide establishing shot', category: 'Exterior', required: true, priority: 'HIGH' },
      { title: 'Production line — wide shot', category: 'Interior', required: true, priority: 'HIGH' },
      { title: 'Production line — machinery detail', category: 'Detail Shot', required: true, priority: 'HIGH' },
      { title: 'Workers in action', category: 'Staff', required: false, priority: 'MEDIUM', description: 'Workers operating machinery or assembling' },
      { title: 'Quality control process', category: 'Behind the Scenes', required: false, priority: 'MEDIUM' },
      { title: 'Final product showcase', category: 'Product', required: true, priority: 'HIGH' },
      { title: 'Company logo / signage', category: 'Detail Shot', required: false, priority: 'LOW' },
      { title: 'Drone / aerial shots', category: 'Drone', required: false, priority: 'MEDIUM', description: 'Aerial footage of facility' },
      { title: 'B-roll video footage', category: 'Video', required: false, priority: 'MEDIUM' },
      { title: 'Staff team photo', category: 'Staff', required: false, priority: 'LOW' },
    ],
  },
  interior: {
    label: 'Interior / Location',
    description: 'Real estate, office, venue, or location shoots',
    shots: [
      { title: 'Main space — wide angle', category: 'Interior', required: true, priority: 'HIGH', description: 'Wide establishing shot of main area' },
      { title: 'Key design features — close-up', category: 'Detail Shot', required: true, priority: 'HIGH' },
      { title: 'Natural light shots', category: 'Interior', required: false, priority: 'MEDIUM', description: 'Window light, golden hour shots' },
      { title: 'Different rooms / areas', category: 'Interior', required: true, priority: 'HIGH', description: 'Cover all key rooms or sections' },
      { title: 'Detail / decorative elements', category: 'Detail Shot', required: false, priority: 'MEDIUM' },
      { title: 'Exterior — facade', category: 'Exterior', required: false, priority: 'MEDIUM' },
      { title: 'Lifestyle shots in space', category: 'Lifestyle', required: false, priority: 'LOW', description: 'People using or enjoying the space' },
      { title: 'Vertical reel clips', category: 'Reel', required: false, priority: 'MEDIUM' },
    ],
  },
  reel_day: {
    label: 'Social Media Reel Day',
    description: 'Full day focused on creating social media video content',
    shots: [
      { title: 'Intro / hook clip (3–5 seconds)', category: 'Reel', required: true, priority: 'HIGH', description: 'Eye-catching opening clip' },
      { title: 'Main product / service showcase', category: 'Reel', required: true, priority: 'HIGH' },
      { title: 'Behind the scenes clip', category: 'Behind the Scenes', required: false, priority: 'MEDIUM' },
      { title: 'Staff / team appearance clip', category: 'Staff', required: false, priority: 'MEDIUM' },
      { title: 'Detail / close-up B-roll', category: 'Detail Shot', required: true, priority: 'HIGH', description: 'Filler B-roll detail clips' },
      { title: 'Trending audio / transition clip', category: 'Reel', required: false, priority: 'MEDIUM' },
      { title: 'CTA / closing clip', category: 'Reel', required: true, priority: 'HIGH', description: 'Call to action closing sequence' },
      { title: 'Story clips (vertical format)', category: 'Story', required: false, priority: 'LOW' },
      { title: 'Testimonial / reaction clip', category: 'Lifestyle', required: false, priority: 'LOW' },
    ],
  },
};

export const EQUIPMENT_OPTIONS = [
  { value: 'camera',     label: 'Camera' },
  { value: 'lens',       label: 'Lens' },
  { value: 'gimbal',     label: 'Gimbal' },
  { value: 'lights',     label: 'Lights / Softbox' },
  { value: 'drone',      label: 'Drone' },
  { value: 'microphone', label: 'Microphone' },
  { value: 'tripod',     label: 'Tripod' },
  { value: 'reflector',  label: 'Reflector' },
  { value: 'backdrop',   label: 'Backdrop' },
  { value: 'other',      label: 'Other' },
];

export const SHOT_CATEGORIES = [
  'Food', 'Product', 'Interior', 'Exterior', 'Staff',
  'Behind the Scenes', 'Detail Shot', 'Lifestyle',
  'Video', 'Reel', 'Story', 'Drone', 'Other',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  'Food':              '#f97316',
  'Product':           '#6366f1',
  'Interior':          '#8b5cf6',
  'Exterior':          '#10b981',
  'Staff':             '#3b82f6',
  'Behind the Scenes': '#f59e0b',
  'Detail Shot':       '#06b6d4',
  'Lifestyle':         '#ec4899',
  'Video':             '#ef4444',
  'Reel':              '#a855f7',
  'Story':             '#14b8a6',
  'Drone':             '#84cc16',
  'Other':             '#6b7280',
};

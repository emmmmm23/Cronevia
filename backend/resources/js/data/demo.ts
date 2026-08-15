/**
 * CRONEVIA DEMO DATA
 *
 * A single coherent dataset used across all pages until the real API
 * returns data. All entries belong to the same fictional user "Juan"
 * and describe the same trip: Three Days in Tagaytay, Aug 29-31 2026.
 *
 * Replace with real API calls as each feature is implemented.
 */

export const DEMO_USER = {
  id: 'demo-user-1',
  name: 'Juan',
  email: 'juan@cronevia.com',
  bio: `Keeping track of the places I've been and the moments worth remembering.`,
  member_since: 'August 2026',
  stats: {
    journal_entries: 3,
    trips: 2,
    memories: 4,
    places: 3,
  },
}

export const DEMO_TRIPS = [
  {
    id: 'trip-1',
    title: 'Three Days in Tagaytay',
    destination: 'Tagaytay, Cavite',
    start_date: '2026-08-29',
    end_date: '2026-08-31',
    status: 'completed' as const,
    description: `A quiet weekend away from the usual routine. Three days of cool air, good coffee, and unhurried mornings.`,
    activity_count: 7,
    memory_count: 4,
    journal_count: 3,
    days: [
      {
        day_number: 1,
        date: '2026-08-29',
        label: 'Day 1 — Departure',
        items: [
          { time: '06:00 AM', title: 'Left Cavite just after sunrise' },
          { time: '08:30 AM', title: 'Arrived in Tagaytay' },
          { time: '12:00 PM', title: 'Lunch at a roadside carinderia' },
          { time: '03:00 PM', title: 'Hotel check-in' },
          { time: '06:00 PM', title: 'Watched the sunset from the ridge' },
        ],
      },
      {
        day_number: 2,
        date: '2026-08-30',
        label: 'Day 2 — Explore',
        items: [
          { time: '07:00 AM', title: 'Morning coffee with the view' },
          { time: '09:30 AM', title: 'Walked around Taal Vista' },
          { time: '12:30 PM', title: 'Lunch — bulalo at a local spot' },
          { time: '03:00 PM', title: 'Explored the side roads' },
          { time: '07:00 PM', title: 'Dinner and early night' },
        ],
      },
      {
        day_number: 3,
        date: '2026-08-31',
        label: 'Day 3 — Return',
        items: [
          { time: '07:30 AM', title: 'Last breakfast' },
          { time: '09:00 AM', title: 'One more look at the view' },
          { time: '10:00 AM', title: 'Checked out' },
          { time: '01:00 PM', title: 'Arrived home in Cavite' },
        ],
      },
    ],
  },
  {
    id: 'trip-2',
    title: 'Batangas Weekend',
    destination: 'Batangas, Philippines',
    start_date: '2026-05-10',
    end_date: '2026-05-12',
    status: 'completed' as const,
    description: 'A short trip down to the coast. We spent most of it by the water.',
    activity_count: 5,
    memory_count: 3,
    journal_count: 2,
    days: [],
  },
]

export const DEMO_JOURNAL = [
  {
    id: 'journal-1',
    trip_id: 'trip-1',
    title: 'A Quiet Morning Above the City',
    date: '2026-08-30',
    location: 'Tagaytay, Cavite',
    mood: 'peaceful' as const,
    tags: ['Travel', 'Coffee', 'Weekend'],
    excerpt: `Morning coffee tasted a little different with the cool air and the city below us. We didn't have anywhere we needed to rush to, so we stayed a little longer.`,
    content: `Morning coffee tasted a little different with the cool air and the city below us. We didn't have anywhere we needed to rush to, so we stayed a little longer.

The fog was still sitting over Taal when we stepped outside. The hotel garden was empty. There was something unusual about having nowhere to be — no meetings, no traffic, no noise beyond the wind moving through the trees.

We ordered another round of coffee.

I don't usually take photographs of these moments. They never look the same in a photo as they do in real life. But I wrote this down so I'd remember what it felt like to be in no hurry at all.

Some mornings are just quieter than others. This was one of them.`,
  },
  {
    id: 'journal-2',
    trip_id: 'trip-1',
    title: 'The Road Out',
    date: '2026-08-29',
    location: 'Cavite to Tagaytay',
    mood: 'excited' as const,
    tags: ['Travel', 'Road Trip'],
    excerpt: `We left just after sunrise. The road was quiet, and for once, I wasn't thinking about where we had to be next.`,
    content: `We left just after sunrise. The road was quiet, and for once, I wasn't thinking about where we had to be next.

The drive from Cavite to Tagaytay takes about an hour and a half on a good day. This was a good day. The highway was nearly empty and the light was that particular shade of gold that only happens in the first hour after sunrise.

I didn't play music for the first twenty minutes. Just the road.

By the time we started climbing toward Tagaytay, the air had already changed. Cooler. Lighter. The kind of air that makes you want to drive slower.

We arrived just before 9.`,
  },
  {
    id: 'journal-3',
    trip_id: null,
    title: 'A Day Worth Remembering',
    date: '2026-07-18',
    location: 'Cavite, Philippines',
    mood: 'nostalgic' as const,
    tags: ['Personal', 'Life'],
    excerpt: `Nothing particularly extraordinary happened today. Maybe that's exactly why I want to remember it.`,
    content: `Nothing particularly extraordinary happened today. Maybe that's exactly why I want to remember it.

Woke up at my usual time. Made coffee. Sat by the window for longer than I normally would. The neighbor's dog was barking at something invisible. The sky was the kind of overcast that never fully commits to rain.

I finished a book I'd been reading in pieces for three months.

Some days feel like they exist outside of any particular story. No event to anchor them. No beginning or ending that stands out. Just a day that passed, quietly and without urgency.

I think those days might actually be the good ones.`,
  },
]

export const DEMO_MEMORIES = [
  {
    id: 'memory-1',
    trip_id: 'trip-1',
    journal_id: 'journal-1',
    title: 'Taal View',
    date: '2026-08-30',
    location: 'Tagaytay',
    description: 'One of those views you wish you could keep forever. The fog was still low when we got there.',
    has_photo: true,
    photo_placeholder: 'landscape',
  },
  {
    id: 'memory-2',
    trip_id: 'trip-1',
    journal_id: 'journal-1',
    title: 'Morning Coffee',
    date: '2026-08-30',
    location: 'Tagaytay',
    description: `The coffee wasn't extraordinary. The morning was.`,
    has_photo: false,
    photo_placeholder: null,
  },
  {
    id: 'memory-3',
    trip_id: 'trip-1',
    journal_id: 'journal-2',
    title: 'Sunset Drive',
    date: '2026-08-29',
    location: 'Tagaytay Ridge',
    description: `We pulled over near the ridge for about ten minutes. Nobody said anything.`,
    has_photo: true,
    photo_placeholder: 'sunset',
  },
  {
    id: 'memory-4',
    trip_id: 'trip-1',
    journal_id: null,
    title: 'The Road Home',
    date: '2026-08-31',
    location: 'Tagaytay to Cavite',
    description: 'Three days went by faster than expected.',
    has_photo: false,
    photo_placeholder: null,
  },
]

export const DEMO_TIMELINE = [
  {
    year: 2026,
    months: [
      {
        month: 'August',
        events: [
          { date: '2026-08-31', title: 'The Road Home', type: 'memory' as const, trip: 'Three Days in Tagaytay', ref_id: 'memory-4' },
          { date: '2026-08-30', title: 'A Quiet Morning Above the City', type: 'journal' as const, trip: 'Three Days in Tagaytay', ref_id: 'journal-1' },
          { date: '2026-08-29', title: 'The Road Out', type: 'journal' as const, trip: 'Three Days in Tagaytay', ref_id: 'journal-2' },
          { date: '2026-08-29', title: 'Three Days in Tagaytay began', type: 'trip' as const, trip: 'Three Days in Tagaytay', ref_id: 'trip-1' },
        ],
      },
      {
        month: 'July',
        events: [
          { date: '2026-07-18', title: 'A Day Worth Remembering', type: 'journal' as const, trip: null, ref_id: 'journal-3' },
        ],
      },
      {
        month: 'May',
        events: [
          { date: '2026-05-12', title: 'Batangas Weekend', type: 'trip' as const, trip: 'Batangas Weekend', ref_id: 'trip-2' },
        ],
      },
    ],
  },
]

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}

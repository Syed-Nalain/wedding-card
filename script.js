const events = {
  mehndi: {
    title: 'Mehndi', kicker: 'A JOYFUL BEGINNING', hosts: 'Mr. & Mrs. Syed Zaheer Hussain',
    names: ['Syed Awais', 'Syed Mahad'], relationship: 'cordially invite you to the Mehndi of their beloved sons',
    description: 'An evening of music, marigolds, and joyful beginnings for two brothers.', cta: 'JOIN THE CELEBRATION',
    caption: 'TWO BROTHERS<br>ONE BRIGHT NIGHT', detailHeading: 'joy & togetherness.',
    detailIntro: 'We look forward to celebrating with family and friends as we begin a beautiful new chapter together.',
    cardEvent: 'Mehndi Celebration', date: 'Monday, 21 December 2026', time: '7:00 PM',
    venue: 'Gulshan-e-Naseem, 30-B, Raza Town, Faisalabad', extra: '',
    family: 'With love from the family of Syed Tajammul Hussain & Syeda Gulshan Naseem Akhtar (late)',
    prev: 'waleema.html', next: 'barat.html', image: 'assets/mehndi-brothers.webp', imageAlt: 'Illustrated portrait of Awais and Mahad together'
  },
  barat: {
    title: 'Barat', kicker: 'THE WEDDING DAY', hosts: 'Mr. & Mrs. Syed Zaheer Hussain',
    names: ['Syed Awais', 'Rida Imran'], relationship: 'invite you to celebrate the Barat of their beloved son',
    description: 'A timeless union, honored with family, tradition, and a little gold.', cta: 'CELEBRATE WITH US',
    caption: 'A PROMISE<br>FOR A LIFETIME', detailHeading: 'a day to remember.',
    detailIntro: 'Join us as Awais and Rida begin their life together, surrounded by the people dearest to them.',
    cardEvent: 'Barat Ceremony', date: 'Tuesday, 22 December 2026', time: '9:00 AM',
    venue: 'The Memories Event Complex, Wazirabad',
    extra: 'Breakfast at 9:00 AM · Barat departs 10:00 AM sharp from Gulshan-e-Naseem, 30-B, Raza Town, Faisalabad · Arrival at the hall at 1:00 PM.',
    family: 'With love from the families of Syed Awais & Rida Imran', prev: 'mehndi.html', next: 'barat-mahad.html',
    image: 'assets/barat-awais-rida.webp', imageAlt: 'Painted portrait illustration of Syed Awais and Rida Imran'
  },
  'barat-mahad': {
    title: 'Barat', kicker: 'THE WEDDING DAY', hosts: 'Mr. & Mrs. Syed Zaheer Hussain',
    names: ['Syed Mahad', 'Urwah Anwaar'], relationship: 'invite you to celebrate the Barat of their beloved son',
    description: 'A joyful beginning, celebrated with tradition, warmth, and family.', cta: 'CELEBRATE WITH US',
    caption: 'A PROMISE<br>FOR A LIFETIME', detailHeading: 'a joyful beginning.',
    detailIntro: 'Join Syed Mahad and Urwah Anwaar for their Barat celebration.',
    cardEvent: 'Barat Ceremony', date: 'Wednesday, 23 December 2026', time: '6:00 PM',
    venue: 'White Rose Marquee', extra: '',
    family: 'With love from the families of Syed Mahad & Urwah Anwaar', prev: 'barat.html', next: 'waleema.html',
    image: 'assets/barat-mahad-urwah.webp', imageAlt: 'Painted portrait illustration of Syed Mahad and Urwah Anwaar'
  },
  waleema: {
    title: 'Waleema', kicker: 'A BEAUTIFUL NEW CHAPTER', hosts: 'Mr. & Mrs. Syed Zaheer Hussain',
    names: ['Syed Awais with Rida Imran', 'Syed Mahad with Urwah Anwaar'],
    relationship: 'cordially invite you to the Waleema ceremony of their beloved sons',
    description: 'An elegant afternoon to gather, give thanks, and toast two new beginnings.', cta: 'JOIN US FOR LUNCH',
    caption: 'TWO COUPLES<br>ONE HAPPY FAMILY', detailHeading: 'two new beginnings.',
    detailIntro: 'Celebrate both couples with us at one joyful gathering. We cannot wait to share the day with you.',
    cardEvent: 'Waleema Ceremony', date: 'Friday, 25 December 2026', time: '2:00 PM',
    venue: 'White Orchard Event Complex, Faisalabad', extra: 'Lunch will be served at 2:00 PM sharp.',
    family: 'With love from the families of Syed Awais & Rida Imran, and Syed Mahad & Urwah Anwaar',
    prev: 'barat-mahad.html', next: 'mehndi.html', image: 'assets/waleema-couples.webp', imageAlt: 'Illustration of Awais and Rida alongside Mahad and Urwah'
  }
};

const path = location.pathname.toLowerCase();
const eventKey = path.endsWith('barat-mahad.html') ? 'barat-mahad' : path.endsWith('barat.html') ? 'barat' : path.endsWith('waleema.html') ? 'waleema' : 'mehndi';
const event = events[eventKey];
const shell = document.querySelector('.site-shell');
shell.dataset.event = eventKey;
document.title = `${event.title}${eventKey === 'barat-mahad' ? ' — Syed Mahad & Urwah Anwaar' : ''} — With Love`;

const fields = {
  kicker: event.kicker, 'event-title': event.title, hosts: event.hosts, 'name-one': event.names[0], 'name-two': event.names[1], relationship: event.relationship,
  description: event.description, cta: event.cta, 'art-caption': event.caption, 'detail-heading': event.detailHeading,
  'detail-intro': event.detailIntro, 'card-event': event.cardEvent, date: event.date, time: event.time,
  venue: event.venue, extra: event.extra, 'family-line': event.family
};
for (const [key, value] of Object.entries(fields)) {
  const el = document.querySelector(`[data-field="${key}"]`);
  if (el) el.innerHTML = value;
}

const portrait = document.querySelector('[data-portrait]');
if (event.image && portrait) {
  portrait.src = event.image;
  portrait.alt = event.imageAlt;
  portrait.hidden = false;
  shell.classList.add('has-portrait');
  if (eventKey.startsWith('barat')) shell.classList.add('barat-art');
}
document.querySelector(`[data-page="${eventKey}"]`)?.classList.add('active');
document.querySelector(`[data-page="${eventKey}"]`)?.setAttribute('aria-current', 'page');
document.querySelector('[data-page-prev]')?.setAttribute('href', event.prev);
document.querySelector('[data-page-next]')?.setAttribute('href', event.next);

document.querySelectorAll('[data-field][contenteditable="true"]').forEach(field => {
  const storageKey = `wedding-card-v3-${eventKey}-${field.dataset.field}`;
  try { const saved = localStorage.getItem(storageKey); if (saved) field.textContent = saved; } catch (_) {}
  field.addEventListener('input', () => { try { localStorage.setItem(storageKey, field.textContent.trim()); } catch (_) {} });
});

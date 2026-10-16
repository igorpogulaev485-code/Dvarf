import type { CharacterDetail } from '../../shared/api/characters'

/** Local fixture for classic 2014 P1 visual review (DEV preview only). */
export const sampleClassic2014Character: CharacterDetail = {
  id: 'preview-classic-2014',
  name: 'Торин Камнебород',
  avatar_url: null,
  level: 5,
  class_name: 'Волшебник',
  race_name: 'Дварф (холмовой)',
  hp_current: 32,
  hp_max: 32,
  rules_edition: '2014',
  sheet_version: 1,
  is_draft: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  sheet: {
    identity: {
      background: 'Мудрец',
      alignment: 'Законно-добрый',
      experience: 6500,
      player_name: 'Игорь',
      age: '152',
      height: '4′2″',
      weight: '148 фнт.',
      eyes: 'Янтарные',
      skin: 'Смуглая, каменный оттенок',
      hair: 'Рыжая коса с сединой',
    },
    proficiency: { bonus: 3 },
    abilities: {
      str: { score: 10 },
      dex: { score: 14 },
      con: { score: 16 },
      int: { score: 18 },
      wis: { score: 12 },
      cha: { score: 8 },
    },
    saves: {
      int: { is_proficient: true },
      wis: { is_proficient: true },
    },
    skills: {
      arcana: { is_proficient: true },
      history: { is_proficient: true },
      investigation: { is_proficient: true },
      perception: { is_proficient: true },
    },
    combat: {
      ac: 15,
      initiative: 2,
      speed: 25,
      inspiration: true,
      hp_temp: 0,
      hp_dice_current: 5,
      death_successes: 0,
      death_fails: 0,
    },
    personality: {
      personality: 'Говорит короткими фразами. Любит карты и камни.',
      ideals: 'Знание стоит любых трудов.',
      bonds: 'Моя семья в Цитадели — всё, что у меня есть.',
      flaws: 'Не доверяет эльфам без причины.',
    },
    features_text: {
      features:
        'Тёмное зрение 60 фт.\nУстойчивость дварфа.\nВладение инструментами камнетёса.\nВосстановление магии (1/день).',
    },
    weapons: [
      { name: 'Боевой посох', attack_bonus: '+5', damage: '1к6+2', damage_type: 'дробящий' },
      { name: 'Кинжал', attack_bonus: '+5', damage: '1к4+2', damage_type: 'колющий' },
      { name: 'Огненный снаряд', attack_bonus: '+7', damage: '3к10', damage_type: 'огонь' },
    ],
    inventory: {
      coins: { cp: 12, sp: 40, ep: 0, gp: 85, pp: 2 },
      items: [
        { name: 'Книга заклинаний' },
        { name: 'Компонентная сумка' },
        { name: 'Рюкзак исследователя' },
        { name: 'Зелье лечения ×2' },
      ],
      notes: '',
    },
    notes: {
      proficiencies:
        'Лёгкие доспехи, боевые топоры, боевые молоты.\nОбщий, дварфийский, эльфийский, драконий.',
      appearance:
        'Коренастый холмовой дварф с огненной бородой, перехваченной бронзовым кольцом. На плаще — руна клана Камнебород.',
      allies:
        'Клан Камнебород (Цитадель Адбар).\nГильдия картографов Невервинтера.\nНапарник по странствиям — эльфийка Лираэль.',
      symbol: 'Клан\nКамнебород',
      background:
        'Годы провёл в архивах Цитадели, пока карта потерянной жилы не увлекла его на поверхность. Ищет руины, где слово сильнее топора.',
      treasure: 'Перстень клана (наследный).\nСапфир из Шахты Эха.\nДолговая расписка на 200 зм.',
    },
    text_blocks: {
      attacks: { value: 'Кантрипы: Огненный снаряд, Свет, Фокусы.' },
      feats: { value: 'Ритуальное заклинание: Обнаружение магии.\nЗаметка: связаться с гильдией после Луны Жатвы.' },
    },
  },
}

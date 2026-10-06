import type { Character } from '../types/character';

/** Пример: дварф-волшебник, правила 2014, лист 2014 (позже можно сменить sheetLayout на 2024). */
export const sampleDwarfWizard2014: Character = {
  id: 'sample-dwarf-wizard',
  rulesEdition: '2014',
  sheetLayout: '2014',

  name: '',
  classAndLevel: 'Волшебник 1',
  background: 'Отшельник',
  playerName: '',
  race: 'Дварф (холмовой)',
  alignment: 'ХН',
  experiencePoints: '',

  abilities: {
    strength: 8,
    dexterity: 14,
    constitution: 16,
    intelligence: 15,
    wisdom: 13,
    charisma: 8,
  },
  inspiration: false,
  proficiencyBonus: 2,
  savingThrowProficiencies: ['intelligence', 'wisdom'],
  skillProficiencies: ['arcana', 'investigation', 'medicine', 'religion'],

  armorClass: '12',
  initiative: '+2',
  speed: '25 фут.',
  hitPointMax: '10',
  hitPointCurrent: '10',
  hitPointTemp: '',
  hitDiceTotal: '1к6',
  hitDiceCurrent: '1',
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,

  attacks: [
    { name: 'Кинжал', attackBonus: '+4', damageType: '1к4+2 колющий' },
    { name: '', attackBonus: '', damageType: '' },
    { name: '', attackBonus: '', damageType: '' },
  ],
  attacksNotes: '',
  equipment: `Книга заклинаний, набор путешественника, мешочек с компонентами, кинжал, обычная одежда, 5 зм.`,
  coins: { cp: '', sp: '', ep: '', gp: '5', pp: '' },
  otherProficienciesAndLanguages: `Доспехи: нет
Оружие: кинжалы, дротики, пращи, боевые посохи, лёгкие арбалеты
Инструменты: набор травника, инструменты кузнеца
Языки: общий, дварфийский, драконий

Дварфийская устойчивость. Сопротивление урону ядом; преимущество к спасброскам от яда.`,
  featuresAndTraits: `Магическое восстановление. Раз за короткий отдых можете восстановить ячейки суммарного уровня ≤ половины уровня волшебника (округляя вверх), но не 6+.

Знание камня. Удвоение бонуса владения к проверкам Истории, связанным с каменной работой.

Дварфийская стойкость. +1 хитов за уровень.

Тёмное зрение. 60 футов.

Ритуальное колдовство. Можете читать ритуальные заклинания волшебника из книги, не подготавливая их.`,

  personalityTraits: `Я сужу людей по поступкам, а не по словам.
Серебро для меня ценнее золота.`,
  ideals: `Логика. Эмоции не должны мешать нашим решениям.`,
  bonds: `Я должен закончить работу мастера — вернуть Камень преобразования.`,
  flaws: `Я скрываю откровение, которое может изменить мир — и боюсь рассказать его не тому.`,

  age: '',
  height: '',
  weight: '',
  eyes: '',
  skin: '',
  hair: '',
  appearance: '',
  backstory: `Вас было трое: мастер, подмастерье и ученик. Рагхорад Седобородый, Оррак и вы. Добровольно удалившись на многие лиги ото всех известных поселений, вы обжили давно разрушенную башню, надёжно укрытую в кряжистых холмах.

Камень преобразования был почти закончен. Рагхорад часто рассуждал, как мановением руки будет превращать скалы в золото и очищать поселения от чумы.

В день, когда мастер преуспел, что-то пошло не так. Вы очнулись одни. Цель ясна: вернуть Камень преобразования.`,
  alliesAndOrganizations: '',
  additionalFeaturesAndTraits: `Откровение. Долгое уединение дало вам великое откровение — определите его вместе с мастером.`,
  treasure: '',

  spellcastingClass: 'Волшебник',
  spellcastingAbility: 'Интеллект',
  spellSaveDc: '12',
  spellAttackBonus: '+4',
  cantrips: ['Огненный снаряд [Fire Bolt]', 'Свет [Light]', 'Формование воды [Shape Water]'],
  spellsByLevel: {
    1: [
      'Волшебная стрела [Magic Missile]',
      'Катапульта [Catapult]',
      'Падение пёрышком [Feather Fall]',
      'Поглощение стихий [Absorb Elements]',
      'Скороход [Longstrider]',
      'Щит [Shield]',
    ],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
    8: [],
    9: [],
  },
  preparedSpells: ['Волшебная стрела [Magic Missile]'],
  spellSlots: {
    1: { total: 2, expended: 0 },
    2: { total: 0, expended: 0 },
    3: { total: 0, expended: 0 },
    4: { total: 0, expended: 0 },
    5: { total: 0, expended: 0 },
    6: { total: 0, expended: 0 },
    7: { total: 0, expended: 0 },
    8: { total: 0, expended: 0 },
    9: { total: 0, expended: 0 },
  },
};

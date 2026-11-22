  const ABIL_CATALOG = {"classes":{"cleric":{"slug":"cleric","features":[{"id":"divine_domain","level":1,"name_ru":"Божественный домен","name_en":"Divine Domain","summary_ru":"Выбери домен. Заклинания домена всегда подготовлены (см. грант архетипа).","kind":"passive"},{"id":"spellcasting_cleric","level":1,"name_ru":"Использование заклинаний","name_en":"Spellcasting","summary_ru":"Полный кастер. Мудрость — базовая характеристика. Подготовка = Мудр. + ур. жреца.","kind":"passive"},{"id":"channel_divinity","level":2,"name_ru":"Божественный канал","name_en":"Channel Divinity","summary_ru":"Общий пул на Изгнание нежити и опции домена. Сброс на коротком или продолжительном отдыхе.","kind":"resource","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"turn_undead","level":2,"name_ru":"Изгнание нежити","name_en":"Turn Undead","summary_ru":"Действием Божественный канал: нежить в 30 фт. спас Мудрости или изгнана 1 мин.","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_harness_divine_power","level":2,"name_ru":"Праведное восстановление","name_en":"Harness Divine Power","summary_ru":"TCE: бонусным действием потратить 1 Божественный канал и 1 дневное применение. Вернуть одну потраченную ячейку не выше половины бонуса мастерства (вверх). Дневных: 1 со 2 ур., 2 с 6, 3 с 18 / долгий отдых.","kind":"bonus","optional":true,"source_book":"tcoe","resource":{"uses":1,"recharge":"long_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"harness_divine_power","pool_name_ru":"Праведное восстановление","track":"spend"}},{"id":"asi_4_cleric","level":4,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_4_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"cantrip_versatility_cleric","level":4,"name_ru":"Универсальность заговора","name_en":"Cantrip Versatility","summary_ru":"TCE (опционально): когда берёшь Увеличение характеристик, можешь заменить один известный заговор жреца на другой из списка жреца.","kind":"passive","optional":true,"source_book":"tcoe"},{"id":"destroy_undead","level":5,"name_ru":"Уничтожение нежити","name_en":"Destroy Undead","summary_ru":"При провале Изгнания нежить с КР ≤ порога уничтожается.","kind":"passive","scale":{"label_ru":"КР","by_level":{"5":"½","8":"1","11":"2","14":"3","17":"4"}}},{"id":"asi_8_cleric","level":8,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_8_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"blessed_strikes","level":8,"name_ru":"Благословенные удары","name_en":"Blessed Strikes","summary_ru":"TCE (опционально): альтернатива Божественный удар / Мощное колдовство домена. Раз в ход +1к8 урона излучением к атаке оружием или к урону заговора жреца.","kind":"passive","optional":true,"source_book":"tcoe","replaces":"divine_strike_or_potent_spellcasting"},{"id":"divine_intervention","level":10,"name_ru":"Божественное вмешательство","name_en":"Divine Intervention","summary_ru":"Действием: d100 ≤ ур. жреца — божество вмешивается. Провал → снова после прод. отдыха. Успех → блок 7 дней (сброс вручную). На 20 ур. — всегда успех.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"divine_intervention","pool_name_ru":"Божественное вмешательство","track":"spend"}},{"id":"asi_12_cleric","level":12,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_12_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"asi_16_cleric","level":16,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_16_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"asi_19_cleric","level":19,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_19_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}}],"subclasses":{"knowledge_domain":{"id":"knowledge_domain","name_ru":"Знание","features":[{"id":"blessings_of_knowledge","level":1,"name_ru":"Благословение знания","name_en":"Blessings of Knowledge","summary_ru":"Выучи два языка. Выбери 2 навыка из: Магия, История, Природа, Религия — владение и компетентность.","kind":"passive","choice":{"id":"knowledge_skills","label_ru":"2 навыка (владение + компетентность)","options":["arcana","history","nature","religion"]},"scale":{"label_ru":"Языки","by_level":{"1":"+2 языка"}}},{"id":"cd_knowledge_of_the_ages","level":2,"name_ru":"Канал: Знание веков","name_en":"Channel Divinity: Knowledge of the Ages","summary_ru":"Действием (тратит канал): владение одним навыком или инструментом на 10 мин.","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_read_thoughts","level":6,"name_ru":"Канал: Чтение мыслей","name_en":"Channel Divinity: Read Thoughts","summary_ru":"Действием (тратит канал): читать мысли; затем suggestion без ячейки.","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"potent_spellcasting_knowledge","level":8,"name_ru":"Мощное колдовство","name_en":"Potent Spellcasting","summary_ru":"+Мудр. к урону заговоров жреца.","kind":"passive","scale":{"label_ru":"Заговоры","by_level":{"8":"+Мудр. к урону"}}},{"id":"visions_of_the_past","level":17,"name_ru":"Видения прошлого","name_en":"Visions of the Past","summary_ru":"Медитация: читать историю предмета или места (см. PHB). (Божественный канал / доменное умение — см. PHB).","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"visions_of_the_past","pool_name_ru":"Видения прошлого","track":"spend"},"scale":{"label_ru":"Медитация","by_level":{"17":"история предмета или места"}}}]},"life_domain":{"id":"life_domain","name_ru":"Жизнь","features":[{"id":"disciple_of_life","level":1,"name_ru":"Ученик жизни","name_en":"Disciple of Life","summary_ru":"Заклинания лечения ≥1 ур.: цель дополнительно получает 2 + уровень ячейки хитов.","kind":"passive","scale":{"label_ru":"Доп. лечение","by_level":{"1":"2 + ур. ячейки"}}},{"id":"cd_preserve_life","level":2,"name_ru":"Канал: Сохранение жизни","name_en":"Channel Divinity: Preserve Life","summary_ru":"Действием (тратит канал): раздай хиты = 5×ур. жреца существам в 30 фт. (каждое — не выше половины макс.).","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"blessed_healer","level":6,"name_ru":"Благословенный целитель","name_en":"Blessed Healer","summary_ru":"Когда лечишь других заклинанием ≥1 ур.: ты тоже получаешь 2 + уровень ячейки хитов.","kind":"passive","scale":{"label_ru":"Самолечение","by_level":{"6":"2 + ур. ячейки при лечении других"}}},{"id":"divine_strike_life","level":8,"name_ru":"Божественный удар","name_en":"Divine Strike","summary_ru":"Раз в ход +1к8 лучистого к урону оружия (+2к8 с 14 ур.).","kind":"passive","scale":{"label_ru":"Урон","by_level":{"8":"+1к8","14":"+2к8"}}},{"id":"supreme_healing","level":17,"name_ru":"Высшее исцеление","name_en":"Supreme Healing","summary_ru":"Лечение заклинаниями и Божественный канал всегда использует максимум на костях.","kind":"passive","scale":{"label_ru":"Кости лечения","by_level":{"17":"всегда максимум"}}}]},"light_domain":{"id":"light_domain","name_ru":"Свет","features":[{"id":"bonus_cantrip_light","level":1,"name_ru":"Доп. заговор","name_en":"Bonus Cantrip","summary_ru":"Знаешь свет (light).","kind":"passive","scale":{"label_ru":"Заговор","by_level":{"1":"light"}}},{"id":"warding_flare","level":1,"name_ru":"Оберегающая вспышка","name_en":"Warding Flare","summary_ru":"Реакция: помеха на атаку по тебе (видишь атакующего в 30 фт.). Использований = мод. Мудрости (мин. 1) / прод. отдых.","kind":"reaction","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"warding_flare","pool_name_ru":"Оберегающая вспышка","track":"spend"}},{"id":"cd_radiance_of_the_dawn","level":2,"name_ru":"Канал: Сияние рассвета","name_en":"Channel Divinity: Radiance of the Dawn","summary_ru":"Действием (тратит канал): магический свет гаснет; враги в 30 фт. спас Телосложения или 2к10+ур. лучистого.","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"improved_flare","level":6,"name_ru":"Улучшенная вспышка","name_en":"Improved Flare","summary_ru":"Оберегающую вспышку можно использовать, когда атакуют другое существо в 30 фт.","kind":"passive","scale":{"label_ru":"Оберегающая вспышка","by_level":{"6":"можно на союзника в 30 фт."}}},{"id":"potent_spellcasting_light","level":8,"name_ru":"Мощное колдовство","name_en":"Potent Spellcasting","summary_ru":"+Мудр. к урону заговоров жреца.","kind":"passive","scale":{"label_ru":"Заговоры","by_level":{"8":"+Мудр. к урону"}}},{"id":"corona_of_light","level":17,"name_ru":"Корона света","name_en":"Corona of Light","summary_ru":"Действием: аура яркого света 60 фт.; враги с помехой на спас от огненных/лучистых твоих заклинаний.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"corona_of_light","pool_name_ru":"Корона света","track":"spend"},"scale":{"label_ru":"Аура","by_level":{"17":"яркий свет 60 фт.; помеха на спас vs твой огонь/луч"}}}]},"nature_domain":{"id":"nature_domain","name_ru":"Природа","features":[{"id":"acolyte_of_nature","level":1,"name_ru":"Служитель природы","name_en":"Acolyte of Nature","summary_ru":"Один заговор друида + владение Природой / Уходом за животными / Выживанием.","kind":"passive","choice":{"id":"nature_skill","label_ru":"Навык","options":["nature","animal_handling","survival"]},"scale":{"label_ru":"Заговор","by_level":{"1":"+1 заговор друида"}}},{"id":"cd_charm_animals_and_plants","level":2,"name_ru":"Канал: Очарование зверей и растений","name_en":"Channel Divinity: Charm Animals and Plants","summary_ru":"Действием (тратит канал): звери и растения в 30 фт. спас Мудрости или очарованы 1 мин.","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"dampen_elements","level":6,"name_ru":"Приглушение стихий","name_en":"Dampen Elements","summary_ru":"Реакция: существо в 30 фт. получает сопротивление выбранному типу урона (огонь/холод/…).","kind":"reaction","choice":{"id":"dampen_element_type","label_ru":"Тип сопротивления (реакция)","options":["acid","cold","fire","lightning","thunder"]},"scale":{"label_ru":"Реакция","by_level":{"6":"существо в 30 фт. — сопротивление выбранному типу"}}},{"id":"divine_strike_nature","level":8,"name_ru":"Божественный удар","name_en":"Divine Strike","summary_ru":"Раз в ход +1к8 холода/огня/электричества к урону оружия (+2к8 с 14).","kind":"passive","scale":{"label_ru":"Урон","by_level":{"8":"+1к8","14":"+2к8"}}},{"id":"master_of_nature","level":17,"name_ru":"Владыка природы","name_en":"Master of Nature","summary_ru":"Можешь командовать очарованными звездами/растениями телепатически.","kind":"passive","scale":{"label_ru":"Очарованные звери/растения","by_level":{"17":"телепатические команды"}}}]},"tempest_domain":{"id":"tempest_domain","name_ru":"Буря","features":[{"id":"wrath_of_the_storm","level":1,"name_ru":"Гнев бури","name_en":"Wrath of the Storm","summary_ru":"Реакция при попадании в ближнем бою: спас Ловкости или 2к8 звука/электричества. Использований = мод. Мудрости (мин. 1) / прод. отдых.","kind":"reaction","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"wrath_of_the_storm","pool_name_ru":"Гнев бури","track":"spend"}},{"id":"cd_destructive_wrath","level":2,"name_ru":"Канал: Разрушительный гнев","name_en":"Channel Divinity: Destructive Wrath","summary_ru":"При уроне звуком/электричеством (тратит канал): максимум на костях вместо броска.","kind":"passive","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"thunderbolt_strike","level":6,"name_ru":"Удар грома","name_en":"Thunderbolt Strike","summary_ru":"При уроне электричеством существу Large или меньше — можно оттолкнуть на 10 фт.","kind":"passive"},{"id":"divine_strike_tempest","level":8,"name_ru":"Божественный удар","name_en":"Divine Strike","summary_ru":"Раз в ход +1к8 грома к урону оружия (+2к8 с 14).","kind":"passive","scale":{"label_ru":"Урон","by_level":{"8":"+1к8","14":"+2к8"}}},{"id":"stormborn","level":17,"name_ru":"Рождённый бурей","name_en":"Stormborn","summary_ru":"На улице под открытым небом — скорость полёта равна скорости ходьбы.","kind":"passive","scale":{"label_ru":"Полёт","by_level":{"17":"полёт = скорость ходьбы (не под землёй и не в помещении)"}}}]},"trickery_domain":{"id":"trickery_domain","name_ru":"Обман","features":[{"id":"blessing_of_the_trickster","level":1,"name_ru":"Благословение плута","name_en":"Blessing of the Trickster","summary_ru":"Действием: существо кроме тебя — преимущество на Скрытность на 1 час.","kind":"action"},{"id":"cd_invoke_duplicity","level":2,"name_ru":"Канал: Призыв двойника","name_en":"Channel Divinity: Invoke Duplicity","summary_ru":"Действием (тратит канал): иллюзорный двойник на 1 мин; можно кастовать из его пространства; преимущество на атаки если оба рядом с целью.","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_cloak_of_shadows","level":6,"name_ru":"Канал: Плащ теней","name_en":"Channel Divinity: Cloak of Shadows","summary_ru":"Действием (тратит канал): невидимость до конца твоего следующего хода (атака/заклинание снимает).","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"divine_strike_trickery","level":8,"name_ru":"Божественный удар","name_en":"Divine Strike","summary_ru":"Раз в ход +1к8 яда к урону оружия (+2к8 с 14).","kind":"passive","scale":{"label_ru":"Урон","by_level":{"8":"+1к8","14":"+2к8"}}},{"id":"improved_duplicity","level":17,"name_ru":"Улучшенный двойник","name_en":"Improved Duplicity","summary_ru":"Можно создать до четырёх двойников; перемещать любого бонусным действием.","kind":"passive","scale":{"label_ru":"Двойник","by_level":{"17":"4 иллюзии; обмен реакцией"}}}]},"war_domain":{"id":"war_domain","name_ru":"Война","features":[{"id":"war_priest","level":1,"name_ru":"Жрец войны","name_en":"War Priest","summary_ru":"Бонусным: атака оружием после действия Атака. Использований = мод. Мудрости (мин. 1) / прод. отдых.","kind":"bonus","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"war_priest","pool_name_ru":"Жрец войны","track":"spend"}},{"id":"cd_guided_strike","level":2,"name_ru":"Канал: Ведомый удар","name_en":"Channel Divinity: Guided Strike","summary_ru":"При атаке (тратит канал): +10 к броску атаки.","kind":"passive","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_war_gods_blessing","level":6,"name_ru":"Канал: Благословение бога войны","name_en":"Channel Divinity: War God's Blessing","summary_ru":"Реакция (тратит канал): существо в 30 фт. получает +10 к атаке.","kind":"reaction","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"divine_strike_war","level":8,"name_ru":"Божественный удар","name_en":"Divine Strike","summary_ru":"Раз в ход +1к8 урона того же типа, что оружие (+2к8 с 14).","kind":"passive","scale":{"label_ru":"Урон","by_level":{"8":"+1к8","14":"+2к8"}}},{"id":"avatar_of_battle","level":17,"name_ru":"Аватар битвы","name_en":"Avatar of Battle","summary_ru":"Сопротивление дробящему, колющему и рубящему от немагического оружия.","kind":"passive"}]},"death_domain":{"id":"death_domain","name_ru":"Смерть","features":[{"id":"reaper","level":1,"name_ru":"Жнец","name_en":"Reaper","summary_ru":"Выучи один некромантийный заговор. Заговор некромантии с одной целью живого существа можешь нацелить на второе в 5 фт. от первого.","kind":"passive","scale":{"label_ru":"Некро-заговор","by_level":{"1":"+1 заговор; одноцель → две цели в 5 фт."}}},{"id":"cd_touch_of_death","level":2,"name_ru":"Канал: Касание смерти","name_en":"Channel Divinity: Touch of Death","summary_ru":"При попадании рукопашной (тратит канал): +некротика = 5 + 2×ур. жреца.","kind":"passive","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"inescapable_destruction","level":6,"name_ru":"Неотвратимое разрушение","name_en":"Inescapable Destruction","summary_ru":"Некротический урон от твоих заклинаний и Божественный канал игнорирует сопротивление некротическому.","kind":"passive","scale":{"label_ru":"Некротика","by_level":{"6":"игнорирует сопротивление (заклинания + Channel)"}}},{"id":"divine_strike_death","level":8,"name_ru":"Божественный удар","name_en":"Divine Strike","summary_ru":"1× / ход при попадании оружием: +1к8 некротического (с 14 ур. +2к8).","kind":"passive","scale":{"label_ru":"Урон","by_level":{"8":"+1к8","14":"+2к8"}}},{"id":"improved_reaper","level":17,"name_ru":"Улучшенный жнец","name_en":"Improved Reaper","summary_ru":"Некромантийное заклинание 1–5 ур. с одной целью живого: можешь нацелить второе в 5 фт. (отдельные спас/атака).","kind":"passive","scale":{"label_ru":"Некро 1–5 ур.","by_level":{"17":"вторая цель в 5 фт."}}}]},"arcana_domain":{"id":"arcana_domain","name_ru":"Тайна","features":[{"id":"arcane_initiate","level":1,"name_ru":"Чародейский посвящённый","name_en":"Arcane Initiate","summary_ru":"Владение Магией; два заговора волшебника (считаются заговорами жреца).","kind":"passive","scale":{"label_ru":"Владения / заговоры","by_level":{"1":"Магия; 2 заговора волшебника как жреца"}}},{"id":"cd_arcane_abjuration","level":2,"name_ru":"Канал: Чародейское изгнание","name_en":"Channel Divinity: Arcane Abjuration","summary_ru":"Действием (тратит канал): изгнать небожителя/элементаля/фею/исчадие (как Изгнание нежити). С 5 ур. — банш при провале по КР.","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"spell_breaker","level":6,"name_ru":"Разрушитель заклинаний","name_en":"Spell Breaker","summary_ru":"Когда восстанавливаешь хиты заклинанием ≥1 ур. существу: также можешь окончить одно заклинание на нём уровня ≤ уровня ячейки лечения.","kind":"passive","scale":{"label_ru":"При лечении заклинанием ≥1","by_level":{"6":"снять заклинание ур. ≤ слота лечения"}}},{"id":"potent_spellcasting_arcana","level":8,"name_ru":"Мощное колдовство","name_en":"Potent Spellcasting","summary_ru":"+Мудр. к урону заговоров жреца.","kind":"passive","scale":{"label_ru":"Заговоры","by_level":{"8":"+Мудр. к урону"}}},{"id":"arcane_mastery","level":17,"name_ru":"Мастерство тайной магии","name_en":"Arcane Mastery","summary_ru":"Выбери по одному заклинанию волшебника 6/7/8/9 круга — всегда подготовлены, считаются заклинаниями жреца.","kind":"passive","choice":{"id":"arcane_mastery_picks","label_ru":"Заклинания волшебника (всегда подготовлены)","options":["wizard_6th","wizard_7th","wizard_8th","wizard_9th"]},"scale":{"label_ru":"Круги","by_level":{"17":"по одному 6/7/8/9"}}}]},"forge_domain":{"id":"forge_domain","name_ru":"Кузница","features":[{"id":"blessing_of_the_forge","level":1,"name_ru":"Благословение кузницы","name_en":"Blessing of the Forge","summary_ru":"В конце прод. отдыха коснись немагического оружия или доспеха: +1 к атаке/урону или +1 КД до следующего прод. отдыха. 1 предмет одновременно.","kind":"passive","resource":{"uses":1,"recharge":"long_rest","pool_id":"blessing_of_the_forge","pool_name_ru":"Благословение кузницы","track":"spend"}},{"id":"cd_artisans_blessing","level":2,"name_ru":"Канал: Благословение ремесленника","name_en":"Channel Divinity: Artisan's Blessing","summary_ru":"Ритуал 1 ч (тратит канал): создать простой/военный металл. предмет стоимостью ≤100 зм.","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"soul_of_the_forge","level":6,"name_ru":"Душа кузницы","name_en":"Soul of the Forge","summary_ru":"Сопротивление огню; +1 КД в тяжёлом доспехе.","kind":"passive"},{"id":"divine_strike_forge","level":8,"name_ru":"Божественный удар","name_en":"Divine Strike","summary_ru":"Раз в ход +1к8 огня к урону оружия (+2к8 с 14).","kind":"passive","scale":{"label_ru":"Урон","by_level":{"8":"+1к8","14":"+2к8"}}},{"id":"saint_of_forge_and_fire","level":17,"name_ru":"Святой кузницы и огня","name_en":"Saint of Forge and Fire","summary_ru":"Иммунитет к огню; сопротивление дробящему/колющему/рубящему в тяжёлом доспехе.","kind":"passive","scale":{"label_ru":"Пока в тяжёлом доспехе","by_level":{"17":"сопр. огню; иммун. к немаг. физ."}}}]},"grave_domain":{"id":"grave_domain","name_ru":"Могила","features":[{"id":"circle_of_mortality","level":1,"name_ru":"Круг смертности","name_en":"Circle of Mortality","summary_ru":"Лечение существа с 0 хитов — максимум на костях. Заговор spare the dying на 30 фт. бонусным действием.","kind":"passive","scale":{"label_ru":"Лечение с 0","by_level":{"1":"макс. на костях; spare the dying 30 фт. бонусным"}}},{"id":"eyes_of_the_grave","level":1,"name_ru":"Глаза могилы","name_en":"Eyes of the Grave","summary_ru":"Действием: ощутить нежить в 60 фт. Использований = Мудр. (мин. 1) / прод. отдых.","kind":"action","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"eyes_of_the_grave","pool_name_ru":"Глаза могилы","track":"spend"}},{"id":"cd_path_to_the_grave","level":2,"name_ru":"Канал: Путь в могилу","name_en":"Channel Divinity: Path to the Grave","summary_ru":"Действием (тратит канал): проклятие — следующее попадание по цели до конца твоего хода критично уязвимо ко всему урону этой атаки.","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"sentinel_at_deaths_door","level":6,"name_ru":"Страж у врат смерти","name_en":"Sentinel at Death's Door","summary_ru":"Реакция: отменить крит по существу в 30 фт. (становится обычным попаданием). Использований = Мудр. / прод. отдых.","kind":"reaction","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"sentinel_at_deaths_door","pool_name_ru":"Страж у врат смерти","track":"spend"}},{"id":"potent_spellcasting_grave","level":8,"name_ru":"Мощное колдовство","name_en":"Potent Spellcasting","summary_ru":"+Мудр. к урону заговоров жреца.","kind":"passive","scale":{"label_ru":"Заговоры","by_level":{"8":"+Мудр. к урону"}}},{"id":"keeper_of_souls","level":17,"name_ru":"Хранитель душ","name_en":"Keeper of Souls","summary_ru":"Когда видимое существо в 60 фт. умирает: ты или союзник в 60 фт. получает хиты = ур. жреца (1×/ход).","kind":"passive","scale":{"label_ru":"При смерти в 60 фт.","by_level":{"17":"ты/союзник получают хиты = ур. жреца (1×/ход)"}}}]},"order_domain":{"id":"order_domain","name_ru":"Порядок","features":[{"id":"voice_of_authority","level":1,"name_ru":"Голос власти","name_en":"Voice of Authority","summary_ru":"Если заклинание 1+ круга нацелено на союзника, он может реакцией атаковать оружием одно существо на твой выбор. Не только лечение.","kind":"passive"},{"id":"cd_orders_demand","level":2,"name_ru":"Канал: Требование порядка","name_en":"Channel Divinity: Order's Demand","summary_ru":"Действием (тратит канал): существа на твой выбор в 30 фт. спас Мудрости или очарованы; можно заставить бросить оружие.","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"embodiment_of_the_law","level":6,"name_ru":"Воплощение закона","name_en":"Embodiment of the Law","summary_ru":"Заклинание очарования жреца 1+ круга — каст бонусным действием. Использований = Мудр. / прод. отдых.","kind":"passive","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"embodiment_of_the_law","pool_name_ru":"Воплощение закона","track":"spend"}},{"id":"divine_strike_order","level":8,"name_ru":"Божественный удар","name_en":"Divine Strike","summary_ru":"Раз в ход +1к8 психического к урону оружия (+2к8 с 14).","kind":"passive","scale":{"label_ru":"Урон","by_level":{"8":"+1к8","14":"+2к8"}}},{"id":"orders_wrath","level":17,"name_ru":"Гнев порядка","name_en":"Order's Wrath","summary_ru":"Если ты попал по существу, союзник до конца твоего следующего хода при попадании наносит +2к8 психического (1×/ход).","kind":"passive"}]},"peace_domain":{"id":"peace_domain","name_ru":"Мир","features":[{"id":"implement_of_peace","level":1,"name_ru":"Орудие мира","name_en":"Implement of Peace","summary_ru":"Владение Проницательностью / Выступлением / Убеждением (на выбор).","kind":"passive","choice":{"id":"implement_of_peace_skill","label_ru":"Навык","options":["insight","performance","persuasion"]}},{"id":"emboldening_bond","level":1,"name_ru":"Укрепляющая связь","name_en":"Emboldening Bond","summary_ru":"Действием: свяжи число существ ≤ мастерства на 10 мин; если в 30 фт. друг от друга — d4 к атаке/проверке/спасу (1×/ход). Использований = бонус мастерства / прод. отдых.","kind":"action","resource":{"uses":0,"uses_from":"proficiency_bonus","recharge":"long_rest","pool_id":"emboldening_bond","pool_name_ru":"Укрепляющая связь","track":"spend"}},{"id":"cd_balm_of_peace","level":2,"name_ru":"Канал: Бальзам мира","name_en":"Channel Divinity: Balm of Peace","summary_ru":"Действием (тратит канал): переместись без провоцирования; каждое существо, мимо которого проходишь, может получить 2к6+Мудр. хитов (1× на существо).","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"protective_bond","level":6,"name_ru":"Защитная связь","name_en":"Protective Bond","summary_ru":"Пока действует Укрепляющая связь: связанный может реакцией телепорт к союзнику в связи, получившему урон, и принять этот урон на себя.","kind":"passive","scale":{"label_ru":"Реакция связанного","by_level":{"6":"телепорт к союзнику под уроном и принять урон"}}},{"id":"potent_spellcasting_peace","level":8,"name_ru":"Мощное колдовство","name_en":"Potent Spellcasting","summary_ru":"+Мудр. к урону заговоров жреца.","kind":"passive","scale":{"label_ru":"Заговоры","by_level":{"8":"+Мудр. к урону"}}},{"id":"expansive_bond","level":17,"name_ru":"Обширная связь","name_en":"Expansive Bond","summary_ru":"Дистанция связи 60 фт.; Защитная связь даёт сопротивление принятому урону.","kind":"passive","scale":{"label_ru":"Связь","by_level":{"17":"60 фт.; Protective Bond → сопротивление принятому урону"}}}]},"twilight_domain":{"id":"twilight_domain","name_ru":"Сумерки","features":[{"id":"eyes_of_night","level":1,"name_ru":"Глаза ночи","name_en":"Eyes of Night","summary_ru":"Тёмное зрение 300 фт.; действием делись им с существами (Мудр. числа) на 1 ч. 1× / прод. отдых или ячейка.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"eyes_of_night","pool_name_ru":"Глаза ночи","track":"spend"}},{"id":"vigilant_blessing","level":1,"name_ru":"Бдительное благословение","name_en":"Vigilant Blessing","summary_ru":"Действием: одно существо — преимущество на следующий бросок инициативы.","kind":"action"},{"id":"cd_twilight_sanctuary","level":2,"name_ru":"Канал: Сумеречное святилище","name_en":"Channel Divinity: Twilight Sanctuary","summary_ru":"Действием (тратит канал): сфера 30 фт. на 1 мин; в конце хода существо в сфере — 1к6+ур. вр. хитов или снять очарование/испуг.","kind":"action","resource":{"uses":1,"recharge":"short_rest","scale_uses":{"2":1,"6":2,"18":3},"pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"steps_of_night","level":6,"name_ru":"Шаги ночи","name_en":"Steps of Night","summary_ru":"В тусклом/тьме бонусным: полёт = скорость на 1 мин. Использований = бонус мастерства / прод. отдых.","kind":"bonus","resource":{"uses":0,"uses_from":"proficiency_bonus","recharge":"long_rest","pool_id":"steps_of_night","pool_name_ru":"Шаги ночи","track":"spend"}},{"id":"divine_strike_twilight","level":8,"name_ru":"Божественный удар","name_en":"Divine Strike","summary_ru":"Раз в ход +1к8 излучением к урону оружия. С 14 уровня — +2к8 излучением.","kind":"passive","scale":{"label_ru":"Урон","by_level":{"8":"+1к8 излучением","14":"+2к8 излучением"}}},{"id":"twilight_shroud","level":17,"name_ru":"Сумеречный покров","name_en":"Twilight Shroud","summary_ru":"Пока действует Сумеречное святилище: ты и союзники в сфере в полуукрытии.","kind":"passive","scale":{"label_ru":"Пока аура","by_level":{"17":"полуукрытие себе и в ауре"}}}]}}},"druid":{"slug":"druid","features":[{"id":"druidic","level":1,"name_ru":"Друидический язык","name_en":"Druidic","summary_ru":"Ты знаешь Друидический — тайный язык друидов. Можешь говорить на нём и оставлять скрытые послания. Ты и те, кто знает этот язык, замечают такое послание автоматически. Остальные замечают само послание успешной проверкой Мудрости (Внимательность) Сл 15, но прочесть его без магии не могут.","kind":"passive"},{"id":"spellcasting_druid","level":1,"name_ru":"Использование заклинаний","name_en":"Spellcasting","summary_ru":"Полный кастер. Мудрость — базовая. Подготовка = Мудр. + ур. друида (мин. 1). Ритуалы.","kind":"passive"},{"id":"druid_circle","level":2,"name_ru":"Круг друидов","name_en":"Druid Circle","summary_ru":"Выбери круг (Земля, Луна, …).","kind":"passive"},{"id":"wild_shape","level":2,"name_ru":"Дикий облик","name_en":"Wild Shape","summary_ru":"Действием принят звериный облик (2× / короткий или прод. отдых). Лимиты CR/плавания/полёта по таблице. С 20 ур. — безлимит (Архидруид).","kind":"action","resource":{"uses":2,"recharge":"short_rest","pool_id":"wild_shape","pool_name_ru":"Дикий облик","track":"spend"},"scale":{"label_ru":"Лимит облика","by_level":{"2":"CR 1/4, без плав./полёта","4":"CR 1/2, плавание","8":"CR 1, полёт"}}},{"id":"wild_companion","level":2,"name_ru":"Дикий спутник","name_en":"Wild Companion","summary_ru":"TCE (опционально): потрать 1 Дикий облик → «Поиск фамильяра» без компонентов; фамильяр — фея; исчезает через число часов = ½ ур. друида.","kind":"action","optional":true,"source_book":"tcoe","resource":{"uses":0,"recharge":"short_rest","pool_id":"wild_companion","pool_name_ru":"Дикий спутник","track":"spend"}},{"id":"asi_4_druid","level":4,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_4_druid_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"cantrip_versatility_druid","level":4,"name_ru":"Универсальность заговора","name_en":"Cantrip Versatility","summary_ru":"TCE (опционально): когда берёшь Увеличение характеристик, можешь заменить один известный заговор друида на другой из списка друида.","kind":"passive","optional":true,"source_book":"tcoe"},{"id":"asi_8_druid","level":8,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_8_druid_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"asi_12_druid","level":12,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_12_druid_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"asi_16_druid","level":16,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_16_druid_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"beast_spells","level":18,"name_ru":"Звериные заклинания","name_en":"Beast Spells","summary_ru":"В Диком облике можешь накладывать друидские заклинания: вербальные и соматические компоненты доступны. Материальные компоненты в облике дать нельзя — ни с ценой, ни бесплатные. Бесплатные нерасходуемые материалы в любом облике игнорирует только Архидруид (20).","kind":"passive"},{"id":"timeless_body","level":18,"name_ru":"Вневременное тело","name_en":"Timeless Body","summary_ru":"Первобытная магия замедляет старение: за каждые 10 лет тело стареет только на 1 год.","kind":"passive"},{"id":"asi_19_druid","level":19,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_19_druid_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"archdruid","level":20,"name_ru":"Архидруид","name_en":"Archdruid","summary_ru":"Дикий облик неограниченно. Игнорируешь вербальный и соматический компоненты друидских заклинаний; материальные без цены/поглощения — тоже.","kind":"passive"}],"subclasses":{"circle_of_the_land":{"id":"circle_of_the_land","name_ru":"Земля","features":[{"id":"bonus_cantrip_land","level":2,"name_ru":"Доп. заговор","name_en":"Bonus Cantrip","summary_ru":"Один дополнительный заговор друида.","kind":"passive","scale":{"label_ru":"Заговор","by_level":{"2":"+1 заговор друида"}}},{"id":"natural_recovery","level":2,"name_ru":"Природное восстановление","name_en":"Natural Recovery","summary_ru":"Во время короткого отдыха восстанови ячейки суммарного уровня ≤ ½ ур. друида (окр. вверх), без 6+. 1× / прод. отдых.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"natural_recovery","pool_name_ru":"Природное восстановление","track":"spend"}},{"id":"circle_spells_land","level":3,"name_ru":"Заклинания круга","name_en":"Circle Spells","summary_ru":"Выбери тип земли — всегда подготовленные заклинания круга (3/5/7/9 ур.).","kind":"passive","choice":{"id":"land_type","label_ru":"Земля круга"}},{"id":"lands_stride","level":6,"name_ru":"Поступь земли","name_en":"Land's Stride","summary_ru":"Немагическая затруднённая местность не стоит дополнительного движения. Немагические растения не замедляют и не ранят шипами, иглами и похожими опасностями. На спасброски против растений, созданных или управляемых магией, чтобы помешать движению (например, Опутывание), преимущество.","kind":"passive","scale":{"label_ru":"Местность","by_level":{"6":"немагическая местность и растения; преим. против маг. растений"}}},{"id":"natures_ward","level":10,"name_ru":"Страж природы","name_en":"Nature's Ward","summary_ru":"Иммунитет к яду и болезни; иммунитет к очарованию/страху элементалей и фей.","kind":"passive","scale":{"label_ru":"Иммунитеты","by_level":{"10":"яд/болезнь; очарование/страх от элементалей и фей"}}},{"id":"natures_sanctuary","level":14,"name_ru":"Святилище природы","name_en":"Nature's Sanctuary","summary_ru":"Зверь или растение, которое тебя атакует, проходит спасбросок Мудрости против Сл заклинаний друида. При провале выбирает другую цель, а если не может — атака сама промахивается. При успехе существо невосприимчиво к эффекту 24 часа и знает о нём до атаки.","kind":"passive","scale":{"label_ru":"Звери/растения","by_level":{"14":"провал: другая цель или промах; успех: иммунитет 24 ч."}}}]},"circle_of_the_moon":{"id":"circle_of_the_moon","name_ru":"Луна","features":[{"id":"combat_wild_shape","level":2,"name_ru":"Боевой дикий облик","name_en":"Combat Wild Shape","summary_ru":"Дикий облик бонусным действием. В облике бонусным: потратить ячейку → 1к8 хитов за уровень ячейки.","kind":"bonus","scale":{"label_ru":"Дикий облик","by_level":{"2":"бонусным; лечение ячейкой в облике"}}},{"id":"circle_forms","level":2,"name_ru":"Облики круга","name_en":"Circle Forms","summary_ru":"Лимит CR Дикого облика: CR 1 на 2 ур.; с 6 ур. CR = ⅓ уровня друида (окр. вниз).","kind":"passive","scale":{"label_ru":"Макс. CR","by_level":{"2":"CR 1, без плавания и полёта","4":"CR 1, плавание","6":"CR 2, плавание","8":"CR 2, плавание и полёт","9":"CR 3, плавание и полёт","12":"CR 4, плавание и полёт","15":"CR 5, плавание и полёт","18":"CR 6, плавание и полёт"}}},{"id":"primal_strike","level":6,"name_ru":"Первобытный удар","name_en":"Primal Strike","summary_ru":"Атаки зверя в Диком облике считаются магическими против сопротивления/иммунитета к немагическому.","kind":"passive","scale":{"label_ru":"Атаки зверя","by_level":{"6":"магические vs сопротивление/иммунитет"}}},{"id":"elemental_wild_shape","level":10,"name_ru":"Элементальный дикий облик","name_en":"Elemental Wild Shape","summary_ru":"Потрать оба использования Дикого облика → воздушный, земляной, огненный или водный элементаль.","kind":"action","resource":{"uses":0,"recharge":"short_rest","pool_id":"elemental_wild_shape","pool_name_ru":"Стихийный облик","track":"spend"},"choice":{"id":"elemental_form","label_ru":"Элементаль","options":["air","earth","fire","water"]}},{"id":"thousand_forms","level":14,"name_ru":"Тысяча обликов","name_en":"Thousand Forms","summary_ru":"Кастуй alter self по желанию без ячейки и компонентов.","kind":"passive","scale":{"label_ru":"Смена обличья","by_level":{"14":"по желанию без ячейки и компонентов"}}}]},"circle_of_dreams":{"id":"circle_of_dreams","name_ru":"Сны","features":[{"id":"balm_of_the_summer_court","level":2,"name_ru":"Бальзам Летнего Двора","name_en":"Balm of the Summer Court","summary_ru":"Пул костей d6 равен уровню друида. Бонусным действием выбери существо, которое видишь в пределах 120 футов, и потрать не больше половины уровня друида костей (округление вниз). Сумма костей — восстановленные хиты, плюс 1 временный хит за каждую кость. Кости возвращаются после продолжительного отдыха. Истощение эта способность не снимает.","kind":"bonus","resource":{"uses":1,"uses_from":"class_level","recharge":"long_rest","pool_id":"balm_of_the_summer_court","pool_name_ru":"Бальзам Летнего Двора","track":"spend"}},{"id":"hearth_of_moonlight_and_shadow","level":6,"name_ru":"Очаг лунного света и тени","name_en":"Hearth of Moonlight and Shadow","summary_ru":"На отдыхе: сфера 30 фт. — +5 к спас/проверкам Скрытности; свет снаружи не проникает.","kind":"passive"},{"id":"hidden_paths","level":10,"name_ru":"Скрытые тропы","name_en":"Hidden Paths","summary_ru":"Бонусным: телепорт себя 60 фт. или согласного в 30 → 30 фт. Число = мод. Мудр. / прод. отдых.","kind":"bonus","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"hidden_paths","pool_name_ru":"Скрытые тропы","track":"spend"}},{"id":"walker_in_dreams","level":14,"name_ru":"Странник снов","name_en":"Walker in Dreams","summary_ru":"Раз / прод. отдых: бесплатный dreaming / scrying / teleportation circle (домой) после короткого отдыха ≥10 мин. (см. XGtE).","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"walker_in_dreams","pool_name_ru":"Странник снов","track":"spend"}}]},"circle_of_the_shepherd":{"id":"circle_of_the_shepherd","name_ru":"Пастырь","features":[{"id":"speech_of_the_woods","level":2,"name_ru":"Речь лесов","name_en":"Speech of the Woods","summary_ru":"Ты знаешь Сильван. Звери понимают твою речь, а ты разбираешь их звуки и движения — заклинание «Разговор с животными» для этого не нужно. Сложные идеи большинство зверей не передают, но дружелюбный зверь может рассказать, что недавно видел или слышал. Дружбы способность сама не даёт.","kind":"passive","scale":{"label_ru":"Язык","by_level":{"2":"Сильван; звери понимают речь без заклинания"}}},{"id":"spirit_totem","level":2,"name_ru":"Дух-тотем","name_en":"Spirit Totem","summary_ru":"Бонусным: призвать дух (Медведь/Ястреб/Единорог) на 1 мин. в 60 фт. 1× / короткий или прод. отдых.","kind":"bonus","resource":{"uses":1,"recharge":"short_rest","pool_id":"spirit_totem","pool_name_ru":"Дух-тотем","track":"spend"}},{"id":"mighty_summoner","level":6,"name_ru":"Могучий призыватель","name_en":"Mighty Summoner","summary_ru":"Призванные звери/феи: +2 хита/кд хитов; атаки считаются магическими.","kind":"passive","scale":{"label_ru":"Призывы","by_level":{"6":"+2 хита/кд; атаки магические"}}},{"id":"guardian_spirit","level":10,"name_ru":"Дух-страж","name_en":"Guardian Spirit","summary_ru":"Пока тотем активен, звери и феи, призванные твоим заклинанием, в конце своего хода в ауре тотема восстанавливают хиты, равные половине уровня друида.","kind":"passive","scale":{"label_ru":"Лечение","formula":"half_class_level","by_level":{"10":"хитов в конце хода призванных зверей и фей"}}},{"id":"faithful_summons","level":14,"name_ru":"Верные призывы","name_en":"Faithful Summons","summary_ru":"При 0 хитов или недееспособности: conjure animals (4× CR 2) на 1 ч. без концентрации. 1× / прод. отдых.","kind":"reaction","resource":{"uses":1,"recharge":"long_rest","pool_id":"faithful_summons","pool_name_ru":"Верные призывы","track":"spend"}}]},"circle_of_spores":{"id":"circle_of_spores","name_ru":"Споры","features":[{"id":"circle_spells_spores","level":2,"name_ru":"Заклинания круга","name_en":"Circle Spells","summary_ru":"Всегда подготовлены: chill touch + список спор (2/3/5/7/9).","kind":"passive","scale":{"label_ru":"Всегда подготовлены","by_level":{"2":"chill touch + список спор"}}},{"id":"halo_of_spores","level":2,"name_ru":"Ореол спор","name_en":"Halo of Spores","summary_ru":"Реакция: существо в 10 фт. начинает ход — некротический урон (1к4 → 1к6@6 → 1к8@10 → 1к10@14), спас Тел. пол.","kind":"reaction","scale":{"label_ru":"Урон","by_level":{"2":"1к4","6":"1к6","10":"1к8","14":"1к10"}}},{"id":"symbiotic_entity","level":2,"name_ru":"Симбиотическая сущность","name_en":"Symbiotic Entity","summary_ru":"Действием: потрать 1 Дикий облик — 10 мин. вр. хиты = 4×ур. друида; удвоенный Ореол; к оружию ближ. +1к6 некротического.","kind":"action","resource":{"uses":0,"recharge":"short_rest","pool_id":"symbiotic_entity","pool_name_ru":"Симбиотическая сущность","track":"spend"},"scale":{"label_ru":"Вр. хиты / урон","by_level":{"2":"4×ур. друида; удвоенный Halo; +1к6 некрот. к оружию"}}},{"id":"fungal_infestation","level":6,"name_ru":"Грибковое заражение","name_en":"Fungal Infestation","summary_ru":"Реакция: гуманоид ≤10 фт. умирает — подними как зомби на 1 ч. Число = мод. Мудр. / прод. отдых.","kind":"reaction","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"fungal_infestation","pool_name_ru":"Грибковое заражение","track":"spend"}},{"id":"spreading_spores","level":10,"name_ru":"Распространяющиеся споры","name_en":"Spreading Spores","summary_ru":"В Симбиотическая сущность бонусным: куб 10 фт. в 30 фт. — урон Ореол в начале хода в зоне (без реакции Ореол).","kind":"bonus","scale":{"label_ru":"Куб 10 фт.","by_level":{"10":"в 30 фт.; урон Halo в начале хода в зоне"}}},{"id":"fungal_body","level":14,"name_ru":"Грибковое тело","name_en":"Fungal Body","summary_ru":"Пока есть хотя бы 1 хит: нельзя ослепить, оглохнуть, испугать или отравить. Критическое попадание по тебе считается обычным.","kind":"passive","scale":{"label_ru":"Пока ≥1 хит","by_level":{"14":"иммунитет: ослепление, глухота, испуг, отравление; крит по тебе — обычное попадание"}}}]},"circle_of_stars":{"id":"circle_of_stars","name_ru":"Звёзды","features":[{"id":"star_map","level":2,"name_ru":"Звёздная карта","name_en":"Star Map","summary_ru":"Звёздная карта — фокус заклинаний друида. Пока она при тебе, ты знаешь заговор Указание. Направляющий снаряд всегда подготовлен и не занимает место в подготовке. Без ячейки его можно наложить число раз, равное бонусу мастерства; применения возвращаются после продолжительного отдыха.","kind":"action","resource":{"uses":2,"uses_from":"proficiency_bonus","recharge":"long_rest","pool_id":"star_map_guiding_bolt","pool_name_ru":"Направляющий снаряд","track":"spend"}},{"id":"starry_form","level":2,"name_ru":"Звёздная форма","name_en":"Starry Form","summary_ru":"Бонусным: потрать Дикий облик → форма Лучника/Чаши/Дракона на 10 мин.","kind":"bonus","resource":{"uses":0,"recharge":"short_rest","pool_id":"starry_form","pool_name_ru":"Звёздная форма","track":"spend"},"choice":{"id":"starry_constellation","label_ru":"Созвездие","options":["archer","chalice","dragon"]}},{"id":"cosmic_omen","level":6,"name_ru":"Космическое знамение","name_en":"Cosmic Omen","summary_ru":"После продолжительного отдыха брось d6: чёт — Благо, нечёт — Горе. Реакция БМ раз: бонус/штраф 1к6 к броску в 30 фт.","kind":"reaction","resource":{"uses":2,"uses_from":"proficiency_bonus","recharge":"long_rest","pool_id":"cosmic_omen","pool_name_ru":"Космическое знамение","track":"spend"}},{"id":"twinkling_constellations","level":10,"name_ru":"Мерцающие созвездия","name_en":"Twinkling Constellations","summary_ru":"Улучшенные созвездия; в конце хода можешь сменить созвездие.","kind":"passive","scale":{"label_ru":"Улучшения","by_level":{"10":"усиленные созвездия; смена в конце хода"}}},{"id":"full_of_stars","level":14,"name_ru":"Полон звёзд","name_en":"Full of Stars","summary_ru":"В Звёздной форме: сопротивление дробящему/колющему/рубящему.","kind":"passive","scale":{"label_ru":"В Звёздной форме","by_level":{"14":"сопр. дробящему/колющему/рубящему"}}}]},"circle_of_wildfire":{"id":"circle_of_wildfire","name_ru":"Дикий огонь","features":[{"id":"circle_spells_wildfire","level":2,"name_ru":"Заклинания круга","name_en":"Circle Spells","summary_ru":"Всегда подготовлены заклинания дикого огня (2/3/5/7/9).","kind":"passive","scale":{"label_ru":"Всегда подготовлены","by_level":{"2":"список дикого огня"}}},{"id":"summon_wildfire_spirit","level":2,"name_ru":"Призыв духа дикого огня","name_en":"Summon Wildfire Spirit","summary_ru":"Действием: потрать Дикий облик — призвать напарника (дух) на 1 ч. (см. TCE).","kind":"action","resource":{"uses":0,"recharge":"short_rest","pool_id":"summon_wildfire_spirit","pool_name_ru":"Дух дикого огня","track":"spend"}},{"id":"enhanced_bond","level":6,"name_ru":"Усиленная связь","name_en":"Enhanced Bond","summary_ru":"Пока дух рядом: к урону/лечению огнём или друидским заклинанием +1к8; каст через пространство духа.","kind":"passive","scale":{"label_ru":"Пока дух рядом","by_level":{"6":"+1к8 к огню/лечению; каст через дух"}}},{"id":"cauterizing_flames","level":10,"name_ru":"Прижигающее пламя","name_en":"Cauterizing Flames","summary_ru":"Когда существо ≤30 фт. от тебя/духа умирает: отметь пространство. Союзник/враг в зоне — лечение или огонь 2к10+Мудр. БМ раз / прод. отдых.","kind":"reaction","resource":{"uses":2,"uses_from":"proficiency_bonus","recharge":"long_rest","pool_id":"cauterizing_flames","pool_name_ru":"Прижигающее пламя","track":"spend"}},{"id":"blazing_revival","level":14,"name_ru":"Пылающее возрождение","name_en":"Blazing Revival","summary_ru":"Если дух в 120 фт. и ты падаешь на 0: дух уничтожается, ты на ½ хитов. 1× / прод. отдых.","kind":"reaction","resource":{"uses":1,"recharge":"long_rest","pool_id":"blazing_revival","pool_name_ru":"Пылающее возрождение","track":"spend"}}]}}},"wizard":{"slug":"wizard","features":[{"id":"arcane_recovery","level":1,"name_ru":"Магическое восстановление","name_en":"Arcane Recovery","summary_ru":"Раз / день после короткого отдыха восстанови ячейки суммарного уровня ≤ ½ ур. волшебника (окр. вверх), без 6+. Сброс на прод. отдыхе.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"arcane_recovery","pool_name_ru":"Магическое восстановление","track":"spend"}},{"id":"spellcasting_wizard","level":1,"name_ru":"Использование заклинаний","name_en":"Spellcasting","summary_ru":"Полный кастер. Интеллект — базовая. Книга заклинаний; подготовка = Инт + ур. волшебника.","kind":"passive"},{"id":"arcane_tradition","level":2,"name_ru":"Магическая традиция","name_en":"Arcane Tradition","summary_ru":"Выбери школу или традицию (Ограждение, Воплощение, Песнь клинка, …).","kind":"passive"},{"id":"cantrip_formulas","level":3,"name_ru":"Формулы заговоров","name_en":"Cantrip Formulas","summary_ru":"TCE (опционально): коротким отдыхом можешь заменить один известный заговор волшебника на другой из списка волшебника.","kind":"passive","optional":true,"source_book":"tcoe"},{"id":"asi_4_wizard","level":4,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_4_wizard_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"asi_8_wizard","level":8,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_8_wizard_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"asi_12_wizard","level":12,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_12_wizard_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"asi_16_wizard","level":16,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_16_wizard_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"spell_mastery","level":18,"name_ru":"Мастерство заклинаний","name_en":"Spell Mastery","summary_ru":"Выбери одно заклинание 1 круга и одно 2 круга из книги. Пока они подготовлены — базовый круг без ячейки; повышение обычной ячейкой. Замена после 8 часов изучения, не при увеличении характеристик.","kind":"passive"},{"id":"asi_19_wizard","level":19,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_19_wizard_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"signature_spells","level":20,"name_ru":"Фирменные заклинания","name_en":"Signature Spells","summary_ru":"Два заклинания 3 круга из книги: всегда подготовлены вне лимита. У каждого свой бесплатный каст 3 круга за короткий или продолжительный отдых. Общий запас не даёт два бесплатных каста одного и того же. Повышение — ячейкой.","kind":"passive"}],"subclasses":{"school_of_abjuration":{"id":"school_of_abjuration","name_ru":"Ограждение","features":[{"id":"abjuration_savant","level":2,"name_ru":"Знаток ограждения","name_en":"Abjuration Savant","summary_ru":"Копирование заклинаний ограждения в книгу — полцены времени и золота.","kind":"passive","scale":{"label_ru":"Копирование","by_level":{"2":"ограждение — ½ времени и золота"}}},{"id":"arcane_ward","level":2,"name_ru":"Магический щит","name_en":"Arcane Ward","summary_ru":"Каст ограждения 1+ круга создаёт щит (хиты = 2×уровень волшебника + мод. Интеллекта) или чинит его на 2×круг ячейки. Щит поглощает урон. После продолжительного отдыха спадает, пока не создашь снова.","kind":"passive","resource":{"uses":4,"uses_from":"twice_class_level_plus_ability","recharge":"long_rest","pool_id":"arcane_ward","pool_name_ru":"Магический щит (хиты)","track":"stock"}},{"id":"projected_ward","level":6,"name_ru":"Проекция щита","name_en":"Projected Ward","summary_ru":"Реакция: союзник в 30 фт. получает урон — перенаправь на Магический щит.","kind":"reaction","scale":{"label_ru":"Реакция","by_level":{"6":"союзник в 30 фт. — урон на Arcane Ward"}}},{"id":"improved_abjuration","level":10,"name_ru":"Улучшенное ограждение","name_en":"Improved Abjuration","summary_ru":"К проверкам способностей заклинаний ограждения добавляй бонус мастерства.","kind":"passive","scale":{"label_ru":"Способности заклинаний","by_level":{"10":"+БМ к проверкам ограждения"}}},{"id":"spell_resistance","level":14,"name_ru":"Сопротивление заклинаниям","name_en":"Spell Resistance","summary_ru":"Преимущество на спас vs заклинаний; сопротивление урону от заклинаний.","kind":"passive","scale":{"label_ru":"vs заклинаний","by_level":{"14":"преим. на спас; сопротивление урону"}}}]},"school_of_conjuration":{"id":"school_of_conjuration","name_ru":"Вызов","features":[{"id":"conjuration_savant","level":2,"name_ru":"Знаток вызова","name_en":"Conjuration Savant","summary_ru":"Копирование заклинаний школы вызова в книгу заклинаний стоит половину времени и золота.","kind":"passive","scale":{"label_ru":"Копирование","by_level":{"2":"вызов — ½ времени и золота"}}},{"id":"minor_conjuration","level":2,"name_ru":"Малый вызов","name_en":"Minor Conjuration","summary_ru":"Действием создать немагический объект в руке/на земле в 10 фт.: ≤3 фута по стороне, ≤10 фунтов, на 1 ч. / до каста снова / до урона объекту.","kind":"action","scale":{"label_ru":"Объект","by_level":{"2":"≤3 фт. / ≤10 фунтов; 1 ч. или до каста вызова"}}},{"id":"benign_transposition","level":6,"name_ru":"Безопасная перестановка","name_en":"Benign Transposition","summary_ru":"Действием телепорт ≤30 фт. или обмен местами с согласным Tiny–Medium в 30 фт. 1× / прод. отдых; восстанавливается при касте вызова ≥1 ур.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"benign_transposition","pool_name_ru":"Безопасная перестановка","track":"spend"}},{"id":"focused_conjuration","level":10,"name_ru":"Сосредоточенный вызов","name_en":"Focused Conjuration","summary_ru":"Концентрация на заклинании школы вызова не прерывается от получения урона.","kind":"passive","scale":{"label_ru":"Концентрация","by_level":{"10":"вызов не срывается от урона"}}},{"id":"durable_summons","level":14,"name_ru":"Стойкие призывы","name_en":"Durable Summons","summary_ru":"Любое существо, призванное тобой заклинанием вызова, получает 30 временных хитов.","kind":"passive","scale":{"label_ru":"Призыв","by_level":{"14":"+30 вр. хитов"}}}]},"school_of_divination":{"id":"school_of_divination","name_ru":"Прорицание","features":[{"id":"divination_savant","level":2,"name_ru":"Знаток прорицания","name_en":"Divination Savant","summary_ru":"Копирование прорицания — полцены времени и золота.","kind":"passive","scale":{"label_ru":"Копирование","by_level":{"2":"прорицание — ½ времени и золота"}}},{"id":"portent","level":2,"name_ru":"Знамение","name_en":"Portent","summary_ru":"После прод. отдыха брось 2к20 — записи. Замени бросок атаки/проверки/спаса (свой или видимый) до броска. С 14 ур. — 3 кости (Великое знамение).","kind":"passive","resource":{"uses":2,"recharge":"long_rest","scale_uses":{"2":2,"14":3},"pool_id":"portent","pool_name_ru":"Кости знамения","track":"stock"}},{"id":"expert_divination","level":6,"name_ru":"Эксперт прорицания","name_en":"Expert Divination","summary_ru":"При касте прорицания ≥2 ур. ячейкой — восстанови ячейку ниже уровня (мин. 1).","kind":"passive","scale":{"label_ru":"При касте прорицания ≥2","by_level":{"6":"вернуть ячейку ниже уровня (мин. 1)"}}},{"id":"the_third_eye","level":10,"name_ru":"Третий глаз","name_en":"The Third Eye","summary_ru":"Действием выбери тёмное зрение 60 / ethereal 60 / read any language / see invisibility 10 фт. до отдыха. 1× / короткий или прод. отдых.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"the_third_eye","pool_name_ru":"Третий глаз","track":"spend"}},{"id":"greater_portent","level":14,"name_ru":"Великое знамение","name_en":"Greater Portent","summary_ru":"После прод. отдыха — 3 кости знамения вместо 2.","kind":"passive","scale":{"label_ru":"Знамение","by_level":{"14":"3 кости вместо 2"}}}]},"school_of_enchantment":{"id":"school_of_enchantment","name_ru":"Очарование","features":[{"id":"enchantment_savant","level":2,"name_ru":"Знаток очарования","name_en":"Enchantment Savant","summary_ru":"Копирование очарования — полцены времени и золота.","kind":"passive","scale":{"label_ru":"Копирование","by_level":{"2":"очарование — ½ времени и золота"}}},{"id":"hypnotic_gaze","level":2,"name_ru":"Гипнотический взгляд","name_en":"Hypnotic Gaze","summary_ru":"Действием: гуманоид в 5 фт. спас Мудр. или очарован; каждый твой ход действием поддерживай. 1× / короткий или прод.; сброс при прерывании без траты.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"hypnotic_gaze","pool_name_ru":"Гипнотический взгляд","track":"spend"}},{"id":"instinctive_charm","level":6,"name_ru":"Инстинктивное очарование","name_en":"Instinctive Charm","summary_ru":"Реакция при атаке по тебе в 30 фт.: спас Мудр. атакующего или он выбирает ближайшую другую цель. 1× / короткий или прод. отдых.","kind":"reaction","resource":{"uses":1,"recharge":"short_rest","pool_id":"instinctive_charm","pool_name_ru":"Инстинктивное очарование","track":"spend"}},{"id":"split_enchantment","level":10,"name_ru":"Разделённое очарование","name_en":"Split Enchantment","summary_ru":"Одноцелевое очарование ≥1 ур. может затронуть вторую цель.","kind":"passive","scale":{"label_ru":"Одноцель ≥1","by_level":{"10":"вторая цель"}}},{"id":"alter_memories","level":14,"name_ru":"Изменение воспоминаний","name_en":"Alter Memories","summary_ru":"При очаровании: цель не знает, что была очарована; можешь потратить действие на ложные воспоминания (спас).","kind":"passive","scale":{"label_ru":"При очаровании","by_level":{"14":"цель не знает; ложные воспоминания действием"}}}]},"school_of_evocation":{"id":"school_of_evocation","name_ru":"Воплощение","features":[{"id":"evocation_savant","level":2,"name_ru":"Знаток воплощения","name_en":"Evocation Savant","summary_ru":"Копирование заклинаний воплощения в книгу стоит половину времени и золота.","kind":"passive","scale":{"label_ru":"Копирование","by_level":{"2":"воплощение — ½ времени и золота"}}},{"id":"sculpt_spells","level":2,"name_ru":"Лепка заклинаний","name_en":"Sculpt Spells","summary_ru":"При воплощении с областью: число существ = 1 + уровень ячейки автоматически преуспевают в спасе и получают 0 урона.","kind":"passive","scale":{"label_ru":"Союзников без урона","by_level":{"2":"1 + ур. ячейки"}}},{"id":"potent_cantrip","level":6,"name_ru":"Мощный заговор","name_en":"Potent Cantrip","summary_ru":"Когда существо преуспевает в спасе от твоего заговора и получило бы половину урона — оно всё равно получает половину (если обычно 0 — получает половину).","kind":"passive","scale":{"label_ru":"Заговор","by_level":{"6":"при успехе спаса vs пол. урона — всё равно пол. урона"}}},{"id":"empowered_evocation","level":10,"name_ru":"Усиленное воплощение","name_en":"Empowered Evocation","summary_ru":"К одному броску урона заклинания воплощения волшебника добавляй свой модификатор Интеллекта.","kind":"passive","scale":{"label_ru":"Воплощение","by_level":{"10":"+Инт к одному броску урона"}}},{"id":"overchannel","level":14,"name_ru":"Перегрузка","name_en":"Overchannel","summary_ru":"При касте волшебного заклинания урона 1–5 ур. ячейкой: макс. урон на костях. 1× / день бесплатно (пул ниже); далее — 2к12 некротического × уровень заклинания за каждый повтор до продолжительный отдых.","kind":"passive","resource":{"uses":1,"recharge":"long_rest","pool_id":"overchannel_free","pool_name_ru":"Перегрузка (бесплатно)","track":"spend"}}]},"school_of_illusion":{"id":"school_of_illusion","name_ru":"Иллюзия","features":[{"id":"illusion_savant","level":2,"name_ru":"Знаток иллюзии","name_en":"Illusion Savant","summary_ru":"Копирование иллюзии — полцены времени и золота.","kind":"passive","scale":{"label_ru":"Копирование","by_level":{"2":"иллюзия — ½ времени и золота"}}},{"id":"improved_minor_illusion","level":2,"name_ru":"Улучшенная малая иллюзия","name_en":"Improved Minor Illusion","summary_ru":"Выучи minor illusion (не в лимит заговоров); можешь создавать звук и образ одновременно.","kind":"passive","scale":{"label_ru":"Малая иллюзия","by_level":{"2":"бесплатно; звук+образ одновременно"}}},{"id":"malleable_illusions","level":6,"name_ru":"Гибкие иллюзии","name_en":"Malleable Illusions","summary_ru":"Действием измени параметры своей иллюзии ≥1 мин. длительности (в пределах заклинания).","kind":"passive","scale":{"label_ru":"Действием","by_level":{"6":"изменить свою иллюзию ≥1 мин."}}},{"id":"illusory_self","level":10,"name_ru":"Иллюзорное я","name_en":"Illusory Self","summary_ru":"Реакция при попадании атакой: иллюзорный двойник — атака промахивается. 1× / короткий или прод. отдых.","kind":"reaction","resource":{"uses":1,"recharge":"short_rest","pool_id":"illusory_self","pool_name_ru":"Иллюзорное я","track":"spend"}},{"id":"illusory_reality","level":14,"name_ru":"Иллюзорная реальность","name_en":"Illusory Reality","summary_ru":"Бонусным после иллюзии ≥1 ур.: один неживой объект иллюзии становится реальным на 1 мин. (без урона).","kind":"bonus","scale":{"label_ru":"Бонусным","by_level":{"14":"1 объект иллюзии реален 1 мин. (без урона)"}}}]},"school_of_necromancy":{"id":"school_of_necromancy","name_ru":"Некромантия","features":[{"id":"necromancy_savant","level":2,"name_ru":"Знаток некромантии","name_en":"Necromancy Savant","summary_ru":"Копирование заклинаний некромантии в книгу стоит половину времени и золота.","kind":"passive","scale":{"label_ru":"Копирование","by_level":{"2":"некромантия — ½ времени и золота"}}},{"id":"grim_harvest","level":2,"name_ru":"Мрачная жатва","name_en":"Grim Harvest","summary_ru":"1× / ход: убив существо заклинанием ≥1 ур. — хиты = 2× уровень ячейки (некромантия: 3×). Не работает на конструктов и нежить.","kind":"passive","scale":{"label_ru":"Лечение","by_level":{"2":"2× ур. ячейки (некро: 3×)"}}},{"id":"undead_thralls","level":6,"name_ru":"Рабы-нежить","name_en":"Undead Thralls","summary_ru":"Выучи animate dead бесплатно. При создании нежити через animate dead: +1 цель; у нежити +хиты = ур. волшебника и +урону = бонус мастерства.","kind":"passive","scale":{"label_ru":"Нежить","by_level":{"6":"+1 цель; +хиты = ур.; +урон = БМ"}}},{"id":"inured_to_undeath","level":10,"name_ru":"Привыкший к нежити","name_en":"Inured to Undeath","summary_ru":"Сопротивление некротическому урону; максимальные хиты нельзя снизить.","kind":"passive","scale":{"label_ru":"Сопр.","by_level":{"10":"некротика; макс. хиты не снижаются от некротики"}}},{"id":"command_undead","level":14,"name_ru":"Повелевать нежитью","name_en":"Command Undead","summary_ru":"Действием: нежить в 60 фт., спасбросок Харизмы (преимущество при Интеллекте 8+). Провал — под контролем, пока умение не использовано снова. Успех — это существо больше нельзя. Дневного лимита нет.","kind":"action"}]},"school_of_transmutation":{"id":"school_of_transmutation","name_ru":"Преобразование","features":[{"id":"transmutation_savant","level":2,"name_ru":"Знаток преобразования","name_en":"Transmutation Savant","summary_ru":"Копирование преобразования — полцены времени и золота.","kind":"passive","scale":{"label_ru":"Копирование","by_level":{"2":"преобразование — ½ времени и золота"}}},{"id":"minor_alchemy","level":2,"name_ru":"Малая алхимия","name_en":"Minor Alchemy","summary_ru":"10 мин.: преобразуй объект из дерева/камня/железа/меди/серебра (1 фут³ / ур.) на 1 ч.","kind":"action","scale":{"label_ru":"Объём","by_level":{"2":"1 фут³ / ур.; 10 мин.; дерево/камень/железо/медь/серебро"}}},{"id":"transmuters_stone","level":6,"name_ru":"Камень преобразующего","name_en":"Transmuter's Stone","summary_ru":"Создай камень с бонусом (скорость / тёмное зрение / сопр. урону / +владение Тел спас). При касте преобразования ≥1 — можешь сменить эффект.","kind":"passive","choice":{"id":"transmuters_stone_bonus","label_ru":"Бонус камня","options":["speed_10","darkvision_60","resistance_acid_cold_fire_lightning_thunder","con_save_proficiency"]},"scale":{"label_ru":"Камень","by_level":{"6":"создай; при касте преобразования ≥1 можно сменить бонус"}}},{"id":"shapechanger","level":10,"name_ru":"Перевёртыш","name_en":"Shapechanger","summary_ru":"Выучи polymorph; на себя в зверя CR ≤1 — без ячейки. 1× / короткий или прод. отдых.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"shapechanger","pool_name_ru":"Перевёртыш","track":"spend"}},{"id":"master_transmuter","level":14,"name_ru":"Мастер преобразования","name_en":"Master Transmuter","summary_ru":"Действием уничтожь камень: Великая трансформация / Панацея / Восстановление жизни / Восстановление молодости (см. PHB).","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"master_transmuter","pool_name_ru":"Мастер преобразования (уничтожить камень)","track":"spend"},"choice":{"id":"master_transmuter_effect","label_ru":"Эффект","options":["major_transformation","panacea","restore_life","restore_youth"]}}]},"bladesinging":{"id":"bladesinging","name_ru":"Песнь клинка","features":[{"id":"training_in_war_and_song","level":2,"name_ru":"Обучение войне и песни","name_en":"Training in War and Song","summary_ru":"Владение лёгкими доспехами; одно оружие ближнего боя (одноручное); навык Выступление.","kind":"passive","scale":{"label_ru":"Владения","by_level":{"2":"лёгкие доспехи; 1 одноручное оружие; Выступление"}}},{"id":"bladesong","level":2,"name_ru":"Песнь клинка","name_en":"Bladesong","summary_ru":"Бонусным (без средних/тяжёлых доспехов и щита): 1 мин. +Инт к КД, скорость +10, преимущество на Акробатику, +Инт к спас концентрации. БМ раз / прод. отдых.","kind":"bonus","resource":{"uses":2,"uses_from":"proficiency_bonus","recharge":"long_rest","pool_id":"bladesong","pool_name_ru":"Песнь клинка","track":"spend"}},{"id":"extra_attack_bladesinging","level":6,"name_ru":"Доп. атака","name_en":"Extra Attack","summary_ru":"При Атаке — две атаки; одну можно заменить на cantrip.","kind":"passive","scale":{"label_ru":"Атаки","by_level":{"6":"2; одну можно заменить на cantrip"}}},{"id":"song_of_defense","level":10,"name_ru":"Песнь защиты","name_en":"Song of Defense","summary_ru":"Пока активна Песнь клинка, реакцией при получении урона: потратить ячейку — снизить урон на 5 × уровень ячейки.","kind":"reaction"},{"id":"song_of_victory","level":14,"name_ru":"Песнь победы","name_en":"Song of Victory","summary_ru":"Пока активна Песнь клинка, добавляй мод. Интеллекта к урону рукопашным оружием.","kind":"passive","scale":{"label_ru":"Урон рукопашным","by_level":{"14":"+мод. Инт пока Песнь клинка"}}}]},"war_magic":{"id":"war_magic","name_ru":"Военная магия","features":[{"id":"arcane_deflection","level":2,"name_ru":"Магическое отклонение","name_en":"Arcane Deflection","summary_ru":"Реакция при попадании/провале спаса: +2 КД или +4 к спас. Затем до конца след. хода только cantrip.","kind":"reaction","scale":{"label_ru":"Реакция","by_level":{"2":"+2 КД или +4 к спас; затем только cantrip до конца след. хода"}}},{"id":"tactical_wit","level":2,"name_ru":"Тактическая смекалка","name_en":"Tactical Wit","summary_ru":"+мод. Инт к инициативе.","kind":"passive","scale":{"label_ru":"Инициатива","by_level":{"2":"+мод. Инт"}}},{"id":"power_surge","level":6,"name_ru":"Всплеск силы","name_en":"Power Surge","summary_ru":"Запас = мод. Интеллекта (минимум 1). Продолжительный отдых оставляет 1 заряд. Успешные контрзаклинание или рассеивание магии дают +1. Короткий отдых при нуле даёт 1. Раз за ход при уроне заклинанием волшебника: потрать заряд, +½ уровня силового урона.","kind":"passive","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"power_surge","pool_name_ru":"Всплеск силы","track":"stock"}},{"id":"durable_magic","level":10,"name_ru":"Стойкая магия","name_en":"Durable Magic","summary_ru":"Пока концентрируешься: +2 КД и ко всем спасам.","kind":"passive","scale":{"label_ru":"Пока концентрируешься","by_level":{"10":"+2 КД и ко всем спасам"}}},{"id":"deflecting_shroud","level":14,"name_ru":"Отклоняющий покров","name_en":"Deflecting Shroud","summary_ru":"При Магическое отклонение: до 3 существ в 60 фт. получают силовой урон = ½ ур. волшебника.","kind":"passive","scale":{"label_ru":"При Магическое отклонение","by_level":{"14":"до 3 существ в 60 фт. — силовой = ½ ур."}}}]},"order_of_scribes":{"id":"order_of_scribes","name_ru":"Орден писцов","features":[{"id":"wizardly_quill","level":2,"name_ru":"Перо волшебника","name_en":"Wizardly Quill","summary_ru":"Магическое перо: копирование в книгу — 2 мин за уровень ячейки; золотые чернила без стоимости; стирание действием.","kind":"passive","scale":{"label_ru":"Перо","by_level":{"2":"2 мин./ур. ячейки; без золотых чернил"}}},{"id":"awakened_spellbook","level":2,"name_ru":"Пробуждённая книга","name_en":"Awakened Spellbook","summary_ru":"Книга — фокус; при касте можешь заменить тип урона на тип другого заклинания того же ур. в книге; ритуал — время как действие.","kind":"passive","scale":{"label_ru":"Книга-фокус","by_level":{"2":"замена типа урона; ритуал из книги"}}},{"id":"manifest_mind","level":6,"name_ru":"Проявить разум","name_en":"Manifest Mind","summary_ru":"Бонусным: спектральный разум книги на 1 ч. Каст через него; БМ раз / прод. отдых (или ячейка любого ур.).","kind":"bonus","resource":{"uses":2,"uses_from":"proficiency_bonus","recharge":"long_rest","pool_id":"manifest_mind","pool_name_ru":"Проявить разум","track":"spend"}},{"id":"master_scrivener","level":10,"name_ru":"Мастер-писец","name_en":"Master Scrivener","summary_ru":"После прод. отдыха создай свиток заклинания ≤2 ур. из книги (усилен на 1 ур.); копирование свитков — полцены.","kind":"passive","scale":{"label_ru":"После продолжительный отдых","by_level":{"10":"свиток ≤2 ур. (+1 ур.); копирование свитков ускорено"}}},{"id":"one_with_the_word","level":14,"name_ru":"Един с словом","name_en":"One with the Word","summary_ru":"Преимущество на проверки Инт (Магия). Реакция при уроне: отменить урон, стёрв заклинания из книги (сумма ур. ≥ ½ урона). 1× / прод. отдых.","kind":"reaction","resource":{"uses":1,"recharge":"long_rest","pool_id":"one_with_the_word","pool_name_ru":"Един с словом","track":"spend"}}]},"chronurgy_magic":{"id":"chronurgy_magic","name_ru":"Хронургия","features":[{"id":"chronal_shift","level":2,"name_ru":"Хрональный сдвиг","name_en":"Chronal Shift","summary_ru":"Реакция: существо в 30 фт. перебрасывает атаку, проверку или спасбросок и берёт новый результат. Число раз = мод. Интеллекта (минимум 1) за продолжительный отдых.","kind":"reaction","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"chronal_shift","pool_name_ru":"Хрональный сдвиг","track":"spend"}},{"id":"temporal_awareness","level":2,"name_ru":"Временная осведомлённость","name_en":"Temporal Awareness","summary_ru":"+мод. Инт к инициативе.","kind":"passive"},{"id":"momentary_stasis","level":6,"name_ru":"Краткий стазис","name_en":"Momentary Stasis","summary_ru":"Действием: Large или меньше в 60 фт. спас Тел. или в стазисе до конца твоего след. хода. Инт раз / прод. отдых.","kind":"action","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"momentary_stasis","pool_name_ru":"Краткий стазис","track":"spend"}},{"id":"arcane_abeyance","level":10,"name_ru":"Магическая отсрочка","name_en":"Arcane Abeyance","summary_ru":"При касте ≤4 ур.: сжать в серый шарик 1 ч.; существо действием выпустить эффект. 1× / короткий или прод. отдых.","kind":"passive","resource":{"uses":1,"recharge":"short_rest","pool_id":"arcane_abeyance","pool_name_ru":"Магическая отсрочка","track":"spend"}},{"id":"convergent_future","level":14,"name_ru":"Сходящееся будущее","name_en":"Convergent Future","summary_ru":"Реакция: заменить бросок атаки/проверки/спаса в 60 фт. на успех или провал. Затем 1 уровень истощения (пока не продолжительный отдых).","kind":"reaction","resource":{"uses":1,"recharge":"long_rest","pool_id":"convergent_future","pool_name_ru":"Сходящееся будущее","track":"spend"}}]},"graviturgy_magic":{"id":"graviturgy_magic","name_ru":"Гравитургия","features":[{"id":"adjust_density","level":2,"name_ru":"Изменить плотность","name_en":"Adjust Density","summary_ru":"Действием: Large или меньше в 30 фт. — вдвое тяжелее (скорость −10, ×2 урон падения) или легче (скорость +10, ×½ падение) на 1 мин./конц.","kind":"action","scale":{"label_ru":"Действием","by_level":{"2":"Large≤ в 30 фт. — ×2 масса или лёгкость"}}},{"id":"gravity_well","level":6,"name_ru":"Гравитационный колодец","name_en":"Gravity Well","summary_ru":"При попадании заклинанием по существу: переместить цель на 5 фт. в свободное место.","kind":"passive","scale":{"label_ru":"При попадании заклинанием","by_level":{"6":"сдвинуть цель на 5 фт."}}},{"id":"violent_attraction","level":10,"name_ru":"Жестокое притяжение","name_en":"Violent Attraction","summary_ru":"Реакция: союзник в 60 фт. попал оружием — +1к10 урона; или существо падает — +2к10. Инт раз / прод. отдых.","kind":"reaction","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"violent_attraction","pool_name_ru":"Жестокое притяжение","track":"spend"}},{"id":"event_horizon","level":14,"name_ru":"Горизонт событий","name_en":"Event Horizon","summary_ru":"Действием: сфера 30 фт. 1 мин./конц. — затруднённая местность; начало хода в сфере — спас Сил. или 2к10 силового + обездвижен. 1× / прод. отдых.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"event_horizon","pool_name_ru":"Горизонт событий","track":"spend"}}]}}},"paladin":{"slug":"paladin","features":[{"id":"divine_sense","level":1,"name_ru":"Божественное чувство","name_en":"Divine Sense","summary_ru":"Действием: знать местоположение небожителей/фиендов/нежити в 60 фт. и освящённые/осквернённые места. Число использований = 1 + модификатор Харизмы / прод. отдых.","kind":"action","resource":{"uses":1,"uses_from":"one_plus_ability_modifier","recharge":"long_rest","pool_id":"divine_sense","pool_name_ru":"Божественное чувство","track":"spend"}},{"id":"lay_on_hands","level":1,"name_ru":"Возложение рук","name_en":"Lay on Hands","summary_ru":"Пул хитов = 5 × ур. паладина. Действием касанием лечить хиты или потратить 5 хитов пула, чтобы снять одну болезнь или яд. Сброс на продолжительном отдыхе. Кружки — точная трата.","kind":"action","resource":{"uses":5,"recharge":"long_rest","scale_uses":{"1":5,"2":10,"3":15,"4":20,"5":25,"6":30,"7":35,"8":40,"9":45,"10":50,"11":55,"12":60,"13":65,"14":70,"15":75,"16":80,"17":85,"18":90,"19":95,"20":100},"pool_id":"lay_on_hands","pool_name_ru":"Возложение рук","track":"spend"}},{"id":"divine_smite","level":2,"name_ru":"Божественная кара","name_en":"Divine Smite","summary_ru":"При попадании оружием ближнего боя: потратить ячейку → +2к8 лучистого (+1к8 за уровень ячейки выше 1-го, макс. 5к8 от ячейки); +1к8 vs нежить/фиенд.","kind":"action"},{"id":"fighting_style_paladin","level":2,"name_ru":"Боевой стиль","name_en":"Fighting Style","summary_ru":"Выбери боевой стиль: Оборона, Дуэлянт, Сражение большим оружием или Защита.","kind":"passive","choice":{"id":"fighting_style","label_ru":"Боевой стиль"}},{"id":"spellcasting_paladin","level":2,"name_ru":"Использование заклинаний","name_en":"Spellcasting","summary_ru":"Половина кастера. Харизма — базовая. Подготовка = Харизма + ½ ур. паладина (мин. 1).","kind":"passive"},{"id":"channel_divinity_paladin","level":3,"name_ru":"Божественный канал","name_en":"Channel Divinity","summary_ru":"1 использование между коротким или продолжительным отдыхом. Общий пул на опции клятвы.","kind":"resource","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"divine_health","level":3,"name_ru":"Божественное здоровье","name_en":"Divine Health","summary_ru":"Иммунитет к болезням.","kind":"passive"},{"id":"sacred_oath","level":3,"name_ru":"Священная клятва","name_en":"Sacred Oath","summary_ru":"Выбери клятву. Клятво-заклинания всегда подготовлены (см. грант). Божественный канал — опции клятвы.","kind":"passive"},{"id":"cd_harness_divine_power","level":3,"name_ru":"Праведное восстановление","name_en":"Harness Divine Power","summary_ru":"TCE: бонусным действием потратить 1 Божественный канал и 1 дневное применение. Вернуть одну потраченную ячейку не выше половины бонуса мастерства (вверх). Дневных: 1 с 3 ур., 2 с 7, 3 с 15 / долгий отдых.","kind":"bonus","optional":true,"source_book":"tcoe","resource":{"uses":1,"recharge":"long_rest","scale_uses":{"3":1,"7":2,"15":3},"pool_id":"harness_divine_power","pool_name_ru":"Праведное восстановление","track":"spend"}},{"id":"asi_4","level":4,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_4_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"martial_versatility_paladin","level":4,"name_ru":"Боевая универсальность","name_en":"Martial Versatility","summary_ru":"TCE (опционально): когда берёшь Увеличение характеристик, можешь заменить один боевой стиль на другой, доступный паладину.","kind":"passive","optional":true,"source_book":"tcoe"},{"id":"extra_attack_paladin","level":5,"name_ru":"Дополнительная атака","name_en":"Extra Attack","summary_ru":"При действии Атака — две атаки вместо одной.","kind":"passive"},{"id":"aura_of_protection","level":6,"name_ru":"Аура защиты","name_en":"Aura of Protection","summary_ru":"Ты и союзники в ауре добавляют твой мод. Харизмы к спасброскам (мин. +1). На листе — бонус к твоим спасам, пока умение открыто.","kind":"passive","scale":{"label_ru":"Радиус","by_level":{"6":"10 фт.","18":"30 фт."}}},{"id":"asi_8","level":8,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_8_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"aura_of_courage","level":10,"name_ru":"Аура отваги","name_en":"Aura of Courage","summary_ru":"Ты и союзники в ауре не могут быть испуганы, пока ты в сознании.","kind":"passive","scale":{"label_ru":"Радиус","by_level":{"10":"10 фт.","18":"30 фт."}}},{"id":"improved_divine_smite","level":11,"name_ru":"Улучшенная божественная кара","name_en":"Improved Divine Smite","summary_ru":"Все атаки оружием ближнего боя несут +1к8 лучистого (складывается с Божественная кара).","kind":"passive"},{"id":"asi_12","level":12,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_12_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"cleansing_touch","level":14,"name_ru":"Очищающее касание","name_en":"Cleansing Touch","summary_ru":"Действием касанием снять одно заклинание с себя или согласного существа. Число = модификатор Харизмы (мин. 1) / прод. отдых.","kind":"action","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"cleansing_touch","pool_name_ru":"Очищающее касание","track":"spend"}},{"id":"asi_16","level":16,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_16_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}},{"id":"aura_improvements","level":18,"name_ru":"Улучшение аур","name_en":"Aura Improvements","summary_ru":"Аура защиты и аура отваги — 30 фт.","kind":"passive"},{"id":"asi_19","level":19,"name_ru":"Увеличение характеристик","name_en":"Ability Score Improvement","summary_ru":"+2 к одной характеристике или +1 к двум (макс. 20), либо черта (скоро).","kind":"passive","choice":{"id":"asi_19_mode","label_ru":"Увеличение характеристик","options":["plus2","plus1x2","feat_coming_soon"]}}],"subclasses":{"oath_of_devotion":{"id":"oath_of_devotion","name_ru":"Преданность","features":[{"id":"cd_sacred_weapon","level":3,"name_ru":"Канал: Священное оружие","name_en":"Channel Divinity: Sacred Weapon","summary_ru":"Действием (тратит канал): оружие на 1 мин. светится; атаки Харизмой; +мод. Хар. к броскам атаки; магическое.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_turn_the_unholy","level":3,"name_ru":"Канал: Изгнание нечисти","name_en":"Channel Divinity: Turn the Unholy","summary_ru":"Действием (тратит канал): фиенды и нежить в 30 фт. спас Мудрости или изгнаны 1 мин.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"aura_of_devotion","level":7,"name_ru":"Аура преданности","name_en":"Aura of Devotion","summary_ru":"Ты и союзники в ауре не могут быть очарованы, пока ты в сознании.","kind":"passive","scale":{"label_ru":"Радиус","by_level":{"7":"10 фт.","18":"30 фт."}}},{"id":"purity_of_spirit","level":15,"name_ru":"Чистота духа","name_en":"Purity of Spirit","summary_ru":"Постоянный эффект protection from evil and good на себе.","kind":"passive"},{"id":"holy_nimbus","level":20,"name_ru":"Священный нимб","name_en":"Holy Nimbus","summary_ru":"Действием: 1 мин. аура 30 фт. — враги в начале хода 1к8 лучистого; преимущество на спас vs фиенд/нежить заклинаний. 1× / прод. отдых.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"holy_nimbus","pool_name_ru":"Священный нимб","track":"spend"}}]},"oath_of_the_ancients":{"id":"oath_of_the_ancients","name_ru":"Древние","features":[{"id":"cd_natures_wrath","level":3,"name_ru":"Канал: Гнев природы","name_en":"Channel Divinity: Nature's Wrath","summary_ru":"Действием (тратит канал): лозы опутывают существо (спас Силы или Ловкости) — состояние опутан, пока не освободится.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_turn_the_faithless","level":3,"name_ru":"Канал: Изгнание безверных","name_en":"Channel Divinity: Turn the Faithless","summary_ru":"Действием (тратит канал): феи и фиенды в 30 фт. спас Мудрости или изгнаны 1 мин.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"aura_of_warding","level":7,"name_ru":"Аура защиты от магии","name_en":"Aura of Warding","summary_ru":"Ты и союзники в ауре сопротивляются урону от заклинаний.","kind":"passive","scale":{"label_ru":"Радиус","by_level":{"7":"10 фт.","18":"30 фт."}}},{"id":"undying_sentinel","level":15,"name_ru":"Бессмертный страж","name_en":"Undying Sentinel","summary_ru":"1× / прод. отдых: при снижении до 0 хитов без мгновенной смерти — остаёшься с 1 хитом. С 15 ур. также не стареешь магически.","kind":"reaction","resource":{"uses":1,"recharge":"long_rest","pool_id":"undying_sentinel","pool_name_ru":"Бессмертный страж","track":"spend"}},{"id":"elder_champion","level":20,"name_ru":"Древний чемпион","name_en":"Elder Champion","summary_ru":"Действием: 1 мин. — реген 10 хитов в начале хода; каст паладина действием-заклинанием как бонусное; враги в 10 фт. с помехой на спас vs твоих заклинаний. 1× / прод. отдых.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"elder_champion","pool_name_ru":"Древний чемпион","track":"spend"}}]},"oath_of_vengeance":{"id":"oath_of_vengeance","name_ru":"Месть","features":[{"id":"cd_abjure_enemy","level":3,"name_ru":"Канал: Отрёкшийся враг","name_en":"Channel Divinity: Abjure Enemy","summary_ru":"Действием (тратит канал): одно существо спас Мудрости или испугано и скорость 0 (нежить/фиенд — помеха на спас).","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_vow_of_enmity","level":3,"name_ru":"Канал: Обет вражды","name_en":"Channel Divinity: Vow of Enmity","summary_ru":"Бонусным (тратит канал): преимущество на атаки по одному существу на 1 мин.","kind":"bonus","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"relentless_avenger","level":7,"name_ru":"Неумолимый мститель","name_en":"Relentless Avenger","summary_ru":"При попадании по существу возможностью: часть реакции — переместиться на половину скорости без провокации.","kind":"passive","scale":{"label_ru":"После OA","by_level":{"7":"перемещение ½ скорости без провоцированных"}}},{"id":"soul_of_vengeance","level":15,"name_ru":"Душа мести","name_en":"Soul of Vengeance","summary_ru":"Пока действует Обет вражды: реакция — атака оружием ближнего боя, когда цель атакует не тебя.","kind":"reaction"},{"id":"avenging_angel","level":20,"name_ru":"Ангел возмездия","name_en":"Avenging Angel","summary_ru":"Действием: 1 час — полёт 60 фт.; аура 30 фт. страх (спас Мудрости); преимущество на атаки по испуганным. 1× / прод. отдых.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"avenging_angel","pool_name_ru":"Ангел возмездия","track":"spend"},"scale":{"label_ru":"Трансформация","by_level":{"20":"полёт; аура испуга 1 ч.; 1× продолжительный отдых"}}}]},"oathbreaker":{"id":"oathbreaker","name_ru":"Клятвопреступник","features":[{"id":"cd_control_undead","level":3,"name_ru":"Канал: Контроль нежити","name_en":"Channel Divinity: Control Undead","summary_ru":"Действием (тратит канал): одна нежить спас Мудрости или под твоим контролем 24 ч. (КР ≤ ур. паладина).","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_dreadful_aspect","level":3,"name_ru":"Канал: Ужасающий лик","name_en":"Channel Divinity: Dreadful Aspect","summary_ru":"Действием (тратит канал): враги в 30 фт. спас Мудрости или испуганы 1 мин.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"aura_of_hate","level":7,"name_ru":"Аура ненависти","name_en":"Aura of Hate","summary_ru":"Ты и дружественная нежить в ауре получают бонус к урону оружием ближнего боя = мод. Хар. (мин. +1).","kind":"passive","scale":{"label_ru":"Радиус","by_level":{"7":"10 фт.","18":"30 фт."}}},{"id":"supernatural_resistance","level":15,"name_ru":"Сверхъестественное сопротивление","name_en":"Supernatural Resistance","summary_ru":"Сопротивление дробящему, колющему и рубящему от немагических атак.","kind":"passive"},{"id":"dread_lord","level":20,"name_ru":"Повелитель ужаса","name_en":"Dread Lord","summary_ru":"Действием: 1 мин. — аура 30 фт. тьма/помеха; реакция 3к10 + Хар. некротического при атаке по тебе в ауре; бонусным — дух-атака. 1× / прод. отдых.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"dread_lord","pool_name_ru":"Повелитель ужаса","track":"spend"}}]},"oath_of_the_crown":{"id":"oath_of_the_crown","name_ru":"Корона","features":[{"id":"cd_champion_challenge","level":3,"name_ru":"Канал: Вызов чемпиона","name_en":"Channel Divinity: Champion Challenge","summary_ru":"Действием (тратит канал): существа по выбору в 30 фт. спас Мудрости или не могут добровольно отойти более чем на 30 фт. от тебя.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_turn_the_tide","level":3,"name_ru":"Канал: Переломный момент","name_en":"Channel Divinity: Turn the Tide","summary_ru":"Бонусным (тратит канал): существа по выбору в 30 фт. с ≤½ хитов получают 1к6 + Хар. временных хитов.","kind":"bonus","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"divine_allegiance","level":7,"name_ru":"Божественная верность","name_en":"Divine Allegiance","summary_ru":"Реакция: когда существо в 5 фт. получает урон — принять этот урон на себя (сопротивления/уязвимости не применяются).","kind":"reaction","scale":{"label_ru":"Реакция","by_level":{"7":"принять урон союзника в 5 фт."}}},{"id":"unyielding_spirit","level":15,"name_ru":"Непреклонный дух","name_en":"Unyielding Spirit","summary_ru":"Преимущество на спас против паралича и оглушения.","kind":"passive"},{"id":"exalted_champion","level":20,"name_ru":"Возвышенный чемпион","name_en":"Exalted Champion","summary_ru":"Действием: 1 час — сопр. дроб/кол/руб; ты и союзники в 30 фт. — преимущество на спас Мудрости/смерти. 1× / прод. отдых.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"exalted_champion","pool_name_ru":"Возвышенный чемпион","track":"spend"},"scale":{"label_ru":"Трансформация","by_level":{"20":"сопр. немаг. физ.; аура спас; 1× продолжительный отдых"}}}]},"oath_of_conquest":{"id":"oath_of_conquest","name_ru":"Завоевание","features":[{"id":"cd_conquering_presence","level":3,"name_ru":"Канал: Присутствие завоевателя","name_en":"Channel Divinity: Conquering Presence","summary_ru":"Действием (тратит канал): существа по выбору в 30 фт. спас Мудрости или испуганы 1 мин.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_guided_strike_paladin","level":3,"name_ru":"Канал: Направляющий удар","name_en":"Channel Divinity: Guided Strike","summary_ru":"При атаке (тратит канал): +10 к броску атаки (после броска, до результата).","kind":"passive","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"aura_of_conquest","level":7,"name_ru":"Аура покорения","name_en":"Aura of Conquest","summary_ru":"Испуганные тобой враги в ауре: скорость 0; в начале хода получают психический урон = ½ ур. паладина.","kind":"passive","scale":{"label_ru":"Радиус","by_level":{"7":"10 фт.","18":"30 фт."}}},{"id":"scornful_rebuke","level":15,"name_ru":"Презрительный укор","name_en":"Scornful Rebuke","summary_ru":"Когда тебя ранят: атакующий получает психический урон = мод. Хар. (мин. 1), если не недееспособен.","kind":"passive"},{"id":"invincible_conqueror","level":20,"name_ru":"Непобедимый завоеватель","name_en":"Invincible Conqueror","summary_ru":"Действием: 1 мин. — сопр. ко всем уронам; доп. атака при Атаке; крит. на 19–20. 1× / прод. отдых.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"invincible_conqueror","pool_name_ru":"Непобедимый завоеватель","track":"spend"}}]},"oath_of_redemption":{"id":"oath_of_redemption","name_ru":"Искупление","features":[{"id":"cd_emissary_of_peace","level":3,"name_ru":"Канал: Посланник мира","name_en":"Channel Divinity: Emissary of Peace","summary_ru":"Бонусным (тратит канал): на 10 мин. +5 к проверкам Харизмы (Убеждение).","kind":"bonus","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_rebuke_the_violent","level":3,"name_ru":"Канал: Укор насильнику","name_en":"Channel Divinity: Rebuke the Violent","summary_ru":"Реакция (тратит канал): когда враг в 30 фт. наносит урон атакой — спас Мудрости или получает лучистый урон = нанесённому.","kind":"reaction","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"aura_of_the_guardian","level":7,"name_ru":"Аура стража","name_en":"Aura of the Guardian","summary_ru":"Реакция: когда существо в ауре получает урон — принять урон на себя.","kind":"reaction","scale":{"label_ru":"Реакция","by_level":{"7":"принять урон союзника в 10/30 фт."}}},{"id":"protective_spirit","level":15,"name_ru":"Защитный дух","name_en":"Protective Spirit","summary_ru":"В начале хода при ≤½ хитов: восстанавливаешь 1к6 + ½ ур. паладина хитов (если не недееспособен).","kind":"passive"},{"id":"emissary_of_redemption","level":20,"name_ru":"Посланник искупления","name_en":"Emissary of Redemption","summary_ru":"Сопротивление ко всему урону от других существ; если бьёшь существо атакой/заклинанием (не по его согласию) — до отдыха теряешь сопротивление и оно получает уязвимость к твоему урону.","kind":"passive"}]},"oath_of_glory":{"id":"oath_of_glory","name_ru":"Слава","features":[{"id":"cd_peerless_athlete","level":3,"name_ru":"Канал: Непревзойдённый атлет","name_en":"Channel Divinity: Peerless Athlete","summary_ru":"Бонусным (тратит канал): 10 мин — преимущество на Атлетику и Акробатику, переносимый вес ×2, прыжок +10 фт. Постоянного владения навыком нет.","kind":"bonus","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_inspiring_smite","level":3,"name_ru":"Канал: Воодушевляющая кара","name_en":"Channel Divinity: Inspiring Smite","summary_ru":"После Божественная кара (тратит канал бонусным): раздать временные хиты = 2к8 + ур. паладина существам в 30 фт.","kind":"bonus","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"aura_of_alacrity","level":7,"name_ru":"Аура рвения","name_en":"Aura of Alacrity","summary_ru":"Твоя скорость +10 фт.; союзники, входящие в ауру впервые в ход, получают +скорость = твой бонус до конца хода.","kind":"passive","scale":{"label_ru":"Радиус","by_level":{"7":"5 фт.","18":"10 фт."}}},{"id":"glorious_defense","level":15,"name_ru":"Славная оборона","name_en":"Glorious Defense","summary_ru":"Реакция, Хар. × / прод. отдых: когда существо в 10 фт. атакуют — +мод. Хар. к КД; при промахе можешь атаковать атакующего, если в досягаемости.","kind":"reaction","resource":{"uses":1,"uses_from":"ability_modifier","recharge":"long_rest","pool_id":"glorious_defense","pool_name_ru":"Славная оборона","track":"spend"}},{"id":"living_legend","level":20,"name_ru":"Живая легенда","name_en":"Living Legend","summary_ru":"Действием: 1 мин. — преимущество на все спасброски; реакцией перебросить провал проверки характеристики. 1× / прод. отдых (или ячейка 5+ ур.).","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"living_legend","pool_name_ru":"Живая легенда","track":"spend"}}]},"oath_of_the_watchers":{"id":"oath_of_the_watchers","name_ru":"Стражи","features":[{"id":"cd_watchers_will","level":3,"name_ru":"Канал: Воля смотрителя","name_en":"Channel Divinity: Watcher's Will","summary_ru":"Действием (тратит канал): ты и союзники по выбору в 30 фт. — преимущество на спас Инт/Мудр/Хар. на 1 мин.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"cd_abjure_the_extraplanar","level":3,"name_ru":"Канал: Отречение внетелесных","name_en":"Channel Divinity: Abjure the Extraplanar","summary_ru":"Действием (тратит канал): аберрации/небожители/элементали/феи/фиенды в 30 фт. спас Мудрости или изгнаны 1 мин.","kind":"action","resource":{"uses":1,"recharge":"short_rest","pool_id":"channel_divinity","pool_name_ru":"Божественный канал","track":"spend"}},{"id":"aura_of_the_sentinel","level":7,"name_ru":"Аура часового","name_en":"Aura of the Sentinel","summary_ru":"Ты и союзники в ауре добавляют мод. мастерства к инициативе (пока в сознании).","kind":"passive","scale":{"label_ru":"Радиус","by_level":{"7":"10 фт.","18":"30 фт."}}},{"id":"vigilant_rebuke","level":15,"name_ru":"Бдительный укор","name_en":"Vigilant Rebuke","summary_ru":"Реакция: когда ты или существо в 30 фт. преуспевает в спас Инт/Мудр/Хар. — наложить 2к8 + Хар. силового на существа, вынудившие спас.","kind":"reaction"},{"id":"mortal_bulwark","level":20,"name_ru":"Смертный бастион","name_en":"Mortal Bulwark","summary_ru":"Действием: 1 мин. — истинное зрение 120 фт.; преимущество на атаки vs аберраций/небожителей/элементалей/фей/фиендов; реакция при провале их спас vs изгнания — доп. атака. 1× / прод. отдых.","kind":"action","resource":{"uses":1,"recharge":"long_rest","pool_id":"mortal_bulwark","pool_name_ru":"Смертный бастион","track":"spend"}}]}}}},"races":[{"slug":"dwarf","name_ru":"Дварф","parent_slug":null,"speed":25,"darkvision":60,"ability_bonuses":{"con":2},"languages":["Общий","Дварфийский"],"languages_choose":0,"tool_choices":{"count":1,"from":["Инструменты кузнеца","Инструменты каменщика","Инструменты пивовара"]},"weapon_proficiencies":["Боевой топор","Ручной топор","Лёгкий молот","Боевой молот"],"armor_proficiencies":[],"damage_resistances":["яд"],"traits_text":"Дварф (2014): +2 Тел. Скорость 25 фт (не снижается тяжёлым доспехом). Тёмное зрение 60 фт. Устойчивость к яду. Владение топорами и молотами. Инструменты камнетёса/кузнеца/пивовара — на выбор.","size":"medium"},{"slug":"mountain_dwarf","name_ru":"Дварф (горный)","parent_slug":"dwarf","speed":25,"darkvision":60,"ability_bonuses":{"con":2,"str":2},"languages":["Общий","Дварфийский"],"languages_choose":0,"tool_choices":{"count":1,"from":["Инструменты кузнеца","Инструменты каменщика","Инструменты пивовара"]},"weapon_proficiencies":["Боевой топор","Ручной топор","Лёгкий молот","Боевой молот"],"armor_proficiencies":["light","medium"],"damage_resistances":["яд"],"traits_text":"Горный дварф (2014): +2 Тел, +2 Сил. Дварфские черты + владение лёгкими и средними доспехами.","size":"medium"},{"slug":"hill_dwarf","name_ru":"Дварф (холмовой)","parent_slug":"dwarf","speed":25,"darkvision":60,"ability_bonuses":{"con":2,"wis":1},"languages":["Общий","Дварфийский"],"languages_choose":0,"tool_choices":{"count":1,"from":["Инструменты кузнеца","Инструменты каменщика","Инструменты пивовара"]},"weapon_proficiencies":["Боевой топор","Ручной топор","Лёгкий молот","Боевой молот"],"armor_proficiencies":[],"damage_resistances":["яд"],"traits_text":"Холмовой дварф (2014): +2 Тел, +1 Муд. Дварфские черты + Каменная стойкость (+1 хитов за уровень).","size":"medium"},{"slug":"elf","name_ru":"Эльф","parent_slug":null,"speed":30,"darkvision":60,"ability_bonuses":{"dex":2},"languages":["Общий","Эльфийский"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Эльф (2014): +2 Лов. Тёмное зрение 60 фт. Наследие фей. Транс. Острое чутьё (Внимательность).","size":"medium"},{"slug":"high_elf","name_ru":"Эльф (высший)","parent_slug":"elf","speed":30,"darkvision":60,"ability_bonuses":{"dex":2,"int":1},"languages":["Общий","Эльфийский"],"languages_choose":1,"tool_choices":null,"weapon_proficiencies":["Длинный меч","Короткий меч","Короткий лук","Длинный лук"],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Высший эльф (2014): +2 Лов, +1 Инт. Эльфийские черты + владение длинным мечом, коротким мечом, коротким и длинным луком. Заговор волшебника (ИНТ). Дополнительный язык на выбор.","size":"medium"},{"slug":"wood_elf","name_ru":"Эльф (лесной)","parent_slug":"elf","speed":35,"darkvision":60,"ability_bonuses":{"dex":2,"wis":1},"languages":["Общий","Эльфийский"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":["Длинный меч","Короткий меч","Короткий лук","Длинный лук"],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Лесной эльф (2014): +2 Лов, +1 Муд. Скорость 35 фт. Эльфийские черты + Маскировка в дикой местности. Владение длинным/коротким мечом и луками.","size":"medium"},{"slug":"drow","name_ru":"Эльф (дроу)","parent_slug":"elf","speed":30,"darkvision":120,"ability_bonuses":{"dex":2,"cha":1},"languages":["Общий","Эльфийский"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":["Рапира","Короткий меч","Ручной арбалет"],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Дроу (2014): +2 Лов, +1 Хар. Тёмное зрение 120 фт. Эльфийские черты. Чувствительность к солнцу. Наследие дроу (пляшущие огоньки / огонь фей / тьма — по уровню). Владение рапирой, коротким мечом, ручным арбалетом.","size":"medium"},{"slug":"halfling","name_ru":"Полурослик","parent_slug":null,"speed":25,"darkvision":0,"ability_bonuses":{"dex":2},"languages":["Общий","Полуросликов"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Полурослик (2014): +2 Лов. Скорость 25 фт. Удачливый. Храбрый. Полуросличья ловкость.","size":"small"},{"slug":"lightfoot_halfling","name_ru":"Полурослик (легконогий)","parent_slug":"halfling","speed":25,"darkvision":0,"ability_bonuses":{"dex":2,"cha":1},"languages":["Общий","Полуросликов"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Полурослик (легконогий, 2014): +2 Лов, +1 Хар. Черты полурослика + Естественная скрытность.","size":"small"},{"slug":"stout_halfling","name_ru":"Полурослик (коренастый)","parent_slug":"halfling","speed":25,"darkvision":0,"ability_bonuses":{"dex":2,"con":1},"languages":["Общий","Полуросликов"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":["яд"],"traits_text":"Полурослик (коренастый, 2014): +2 Лов, +1 Тел. Черты полурослика + устойчивость к яду.","size":"small"},{"slug":"human","name_ru":"Человек","parent_slug":null,"speed":30,"darkvision":0,"ability_bonuses":{"str":1,"dex":1,"con":1,"int":1,"wis":1,"cha":1},"languages":["Общий"],"languages_choose":1,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Человек (2014): +1 ко всем характеристикам. Дополнительный язык. Скорость 30 фт. Вариант PHB и метки дракона ERLW — опционально в попапе.","size":"medium"},{"slug":"human_variant","name_ru":"Человек (вариант)","parent_slug":"human","speed":30,"darkvision":0,"ability_bonuses":{},"languages":["Общий"],"languages_choose":1,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Человек, вариант (2014): +1 к двум разным характеристикам. Навык на выбор. Черта. Язык на выбор.","size":"medium"},{"slug":"dragonborn","name_ru":"Драконорождённый","parent_slug":null,"speed":30,"darkvision":0,"ability_bonuses":{"str":2,"cha":1},"languages":["Общий","Драконий"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Драконорождённый (PHB 2014): +2 Сил, +1 Хар. Драконье происхождение (10 типов): сопротивление и дыхание. Разновидности FTD (цветной / драгоцветный / металлический) — опционально в попапе.","size":"medium"},{"slug":"gnome","name_ru":"Гном","parent_slug":null,"speed":25,"darkvision":60,"ability_bonuses":{"int":2},"languages":["Общий","Гномий"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Гном (2014): +2 Инт. Тёмное зрение 60 фт. Скорость 25 фт. Гномья хитрость.","size":"small"},{"slug":"forest_gnome","name_ru":"Гном (лесной)","parent_slug":"gnome","speed":25,"darkvision":60,"ability_bonuses":{"int":2,"dex":1},"languages":["Общий","Гномий"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Гном (лесной, 2014): +2 Инт, +1 Лов. Гномьи черты + природная иллюзия (малая иллюзия) и общение с маленькими зверями.","size":"small"},{"slug":"rock_gnome","name_ru":"Гном (скальный)","parent_slug":"gnome","speed":25,"darkvision":60,"ability_bonuses":{"int":2,"con":1},"languages":["Общий","Гномий"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Гном (скальный, 2014): +2 Инт, +1 Тел. Гномьи черты + знание ремесла и болтун-механизм. Владение инструментами ремонтника.","size":"small"},{"slug":"half_elf","name_ru":"Полуэльф","parent_slug":null,"speed":30,"darkvision":60,"ability_bonuses":{"cha":2},"languages":["Общий","Эльфийский"],"languages_choose":1,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Полуэльф (2014): +2 Хар и +1 к двум другим. Тёмное зрение 60 фт. Наследие фей. Два навыка на выбор. Язык на выбор. Наследия SCAG и метки ERLW — опционально в попапе.","size":"medium"},{"slug":"half_orc","name_ru":"Полуорк","parent_slug":null,"speed":30,"darkvision":60,"ability_bonuses":{"str":2,"con":1},"languages":["Общий","Орочий"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":[],"traits_text":"Полуорк (2014): +2 Сил, +1 Тел. Тёмное зрение 60 фт. Угрожающий вид. Непреклонная выносливость. Свирепые атаки. Метка поиска ERLW — опционально в попапе.","size":"medium"},{"slug":"tiefling","name_ru":"Тифлинг","parent_slug":null,"speed":30,"darkvision":60,"ability_bonuses":{"cha":2,"int":1},"languages":["Общий","Инфернальный"],"languages_choose":0,"tool_choices":null,"weapon_proficiencies":[],"armor_proficiencies":[],"damage_resistances":["огонь"],"traits_text":"Тифлинг (PHB / Асмодей, 2014): +2 Хар, +1 Инт. Тёмное зрение 60 фт. Сопротивление огню. Адское наследие (чудотворство / адское возмездие / тьма). Варианты крови — в попапе.","size":"medium"}],"backgrounds":[{"slug":"acolyte","name_ru":"Прислужник","skills":["insight","religion"],"skill_choices":null,"tools":[],"languages_choose":2,"feature_name_ru":"Приют для верующих","feature_text_ru":"Вы и ваши спутники можете рассчитывать на бесплатное лечение и уход в храмах, святынях и других подобных местах, посвящённых вашей вере. Вам придётся предоставить материальные компоненты для заклинаний, если таковые понадобятся. Те, кто разделяют вашу веру, могут обеспечить вам (но только вам) скромное существование. У вас также могут быть связи с каким-то конкретным храмом, посвящённым вашему божеству или пантеону, в котором у вас есть жилая комната. Пока вы находитесь с этим храмом в хороших отношениях, находясь неподалёку от него, вы можете попросить у его служителей помощи, если она не подвергнет их опасности."},{"slug":"charlatan","name_ru":"Шарлатан","skills":["deception","sleight_of_hand"],"skill_choices":null,"tools":["Набор для грима","Набор для фальсификации"],"languages_choose":0,"feature_name_ru":"Поддельная личность","feature_text_ru":"Вы создали себе вторую личность, включая необходимые документы, знакомства и маскировку, что позволяет вам перевоплощаться в этот образ. В дополнение к этому вы можете подделывать документы, включая официальные документы и личные письма, если ранее видели пример подобного документа или почерк, который пытаетесь скопировать."},{"slug":"criminal","name_ru":"Преступник","skills":["deception","stealth"],"skill_choices":null,"tools":["Воровские инструменты"],"languages_choose":0,"feature_name_ru":"Криминальные связи","feature_text_ru":"У вас есть надёжное доверенное лицо, которое выступает в роли вашего связного в криминальных кругах. Вы умеете получать и отправлять сведения связному, даже через большие расстояния: например, вы знаете местных посыльных, продажных караванщиков и нечистых на руку матросов, которые могут доставить сообщение для вас."},{"slug":"entertainer","name_ru":"Артист","skills":["acrobatics","performance"],"skill_choices":null,"tools":["Набор для грима"],"languages_choose":0,"feature_name_ru":"По многочисленным просьбам","feature_text_ru":"Вы всегда можете найти место для выступления. Обычно это таверна или постоялый двор, но это может быть цирк, театр или даже двор знатного господина. В этом месте вы получаете бесплатный постой и еду по скромным или комфортным стандартам (в зависимости от качества заведения), если вы выступаете каждый вечер. Кроме того, ваши выступления делают вас местной знаменитостью. Когда посторонние узнают вас в городе, в котором вы давали представление, они, скорее всего, будут к вам относиться хорошо."},{"slug":"folk-hero","name_ru":"Народный герой","skills":["animal_handling","survival"],"skill_choices":null,"tools":["Транспорт (наземный)"],"languages_choose":0,"feature_name_ru":"Деревенское гостеприимство","feature_text_ru":"Вы сами из простого народа, и потому легко находите с ними общий язык. Вы можете найти место, чтобы спрятаться, отдохнуть или подлечиться среди обывателей, если только вы не угрожаете им. Они укроют вас от представителей закона и тех, кто ищет вас, но своими жизнями за вас они рисковать не будут."},{"slug":"guild-artisan","name_ru":"Гильдейский ремесленник","skills":["insight","persuasion"],"skill_choices":null,"tools":[],"languages_choose":1,"feature_name_ru":"Членство в гильдии","feature_text_ru":"Будучи авторитетным и уважаемым членом гильдии, вы можете пользоваться особыми преимуществами, предоставляемыми этим членством. Ваши товарищи по гильдии при необходимости предоставят вам жилище и питание, и даже оплатят ваши похороны. В некоторых городах у гильдий есть место для сбора, и там можно потенциально встретить покровителей, союзников и наёмников. Гильдии часто обладают значительной политической властью. Если вас обвинят в преступлении, гильдия может помочь, если существует вероятность оправдательного приговора. Благодаря гильдии вы получаете доступ к влиятельным политикам, если состоите в гильдии на хорошем счету. Для таких связей может потребоваться жертвование денег или магических предметов в казну гильдии. Каждый месяц вы должны выплачивать гильдии 5 зм. Если вы пропустите платёж, вы должны вначале оплатить все долги, и только тогда восстановите своё доброе имя в гильдии."},{"slug":"hermit","name_ru":"Отшельник","skills":["medicine","religion"],"skill_choices":null,"tools":["Набор травника"],"languages_choose":1,"feature_name_ru":"Откровение","feature_text_ru":"Тихое уединение в долгом отшельничестве дало вам доступ к великому откровению. Точная природа этого откровения зависит от характера вашего уединения. Это может быть истина о вселенной, божествах, влиятельных созданиях на внешних планах, или силах природы. Это может быть место, которое никто и никогда не видел. Вы могли обнаружить что-то, что давно было забыто, или найти реликвию прошлого, способную переписать историю. Это может быть информация, которая может причинить вред тем, кто изгнал вас, и тем самым ставшая причиной возвращения в общество. Придумайте вместе с Мастером детали вашего откровения и его влияние на кампанию."},{"slug":"noble","name_ru":"Благородный","skills":["history","persuasion"],"skill_choices":null,"tools":[],"languages_choose":1,"feature_name_ru":"Привилегированность","feature_text_ru":"Благодаря знатному происхождению, другие хорошо к вам относятся. Вас принимают в высшем обществе, и считается, что у вас есть право посещать любые места. Обыватели изо всех сил стараются сделать вам приятно и избежать вашего гнева, а другие высокородные считают вас своей ровней. Если нужно, вы можете получить аудиенцию местного дворянина."},{"slug":"outlander","name_ru":"Чужеземец","skills":["athletics","survival"],"skill_choices":null,"tools":[],"languages_choose":1,"feature_name_ru":"Странник","feature_text_ru":"Вы отлично запоминаете карты и местность, и всегда можете вспомнить общие характеристики местности, поселения, и прочие особенности в окрестностях. Кроме того, вы каждый день можете находить еду и пресную воду для себя и пяти других товарищей, при условии, что вокруг вас можно найти ягоды, дичь, воду и так далее."},{"slug":"sage","name_ru":"Мудрец","skills":["arcana","history"],"skill_choices":null,"tools":[],"languages_choose":2,"feature_name_ru":"Исследователь","feature_text_ru":"Если вы пытаетесь изучить или вспомнить информацию, которой вы не обладаете, вы часто знаете, где и от кого её можно получить. Обычно это библиотека, скрипторий, университет, мудрец или другое образованное существо. Мастер может решить, что искомое знание является тайной и хранится в практически недоступном месте, или что оно вообще недоступно. Поиски глубочайших тайн вселенной могут потребовать отдельного приключения или даже целой кампании."},{"slug":"sailor","name_ru":"Моряк","skills":["athletics","perception"],"skill_choices":null,"tools":["Инструменты навигатора","Транспорт (водный)"],"languages_choose":0,"feature_name_ru":"Корабельный проход","feature_text_ru":"Если понадобится, вы можете получить бесплатную поездку на паруснике для себя и своих спутников. Это может быть ваш старый корабль, или другой корабль, с которым вы находитесь в хороших отношениях (возможно, им командует ваш бывший напарник). Вам оказывают услугу, поэтому вы не можете устанавливать распорядок и прокладывать маршрут. Мастер сообщит, сколько времени уйдёт на плавание. В обмен на бесплатную поездку от вас и ваших спутников ожидают посильную помощь экипажу во время плавания."},{"slug":"soldier","name_ru":"Солдат","skills":["athletics","intimidation"],"skill_choices":null,"tools":["Транспорт (наземный)"],"languages_choose":0,"feature_name_ru":"Воинское звание","feature_text_ru":"Будучи солдатом, вы заслужили звание. Солдаты, верные военной организации, которой вы раньше принадлежали, всё еще признают вашу власть и влияние, и они подчиняются вам, если их звание ниже вашего. С помощью своего звания вы можете оказывать влияние на других солдат и брать во временное пользование простое снаряжение или лошадей. Возможно, вас пропустят внутрь военного лагеря или крепости, если к вашему званию отнесутся с уважением."},{"slug":"urchin","name_ru":"Беспризорник","skills":["sleight_of_hand","stealth"],"skill_choices":null,"tools":["Воровские инструменты","Набор для грима"],"languages_choose":0,"feature_name_ru":"Городские тайны","feature_text_ru":"Вы знаете тайные лазы и проходы городских улиц, позволяющие пройти там, где другие не увидят пути. Вне боя вы (и ведомые вами союзники) можете перемещаться по городу вдвое быстрее обычного."},{"slug":"spy","name_ru":"Шпион","skills":["deception","stealth"],"skill_choices":null,"tools":["Воровские инструменты"],"languages_choose":0,"feature_name_ru":"Криминальные связи","feature_text_ru":"У вас есть надёжное доверенное лицо, которое выступает в роли вашего связного в сети шпионажа. Вы знаете, как связаться с ним в крупных поселениях, и можете получить помощь и сведения — в пределах разумного — от его контактов."},{"slug":"gladiator","name_ru":"Гладиатор","skills":["acrobatics","performance"],"skill_choices":null,"tools":["Набор для грима"],"languages_choose":0,"feature_name_ru":"Посмотри на меня","feature_text_ru":"Вы всегда можете найти место для выступления там, где развлекают сражениями — на арене гладиаторов или в тайном бойцовском клубе. Пока вы выступаете каждый день, вас кормят по скромным стандартам. Вместо музыкального инструмента в снаряжении можно взять недорогое необычное оружие (например, трезубец или сеть)."},{"slug":"guild-merchant","name_ru":"Гильдейский купец","skills":["insight","persuasion"],"skill_choices":null,"tools":[],"languages_choose":1,"feature_name_ru":"Членство в гильдии","feature_text_ru":"Будучи уважаемым членом гильдии купцов, вы можете рассчитывать на еду и кров у согильдийцев, а также на поддержку в правовых спорах (в разумных пределах). Гильдия ждёт от вас исполнения обязанностей и уплаты взносов."},{"slug":"knight","name_ru":"Рыцарь","skills":["history","persuasion"],"skill_choices":null,"tools":[],"languages_choose":1,"feature_name_ru":"Слуги","feature_text_ru":"Вы получаете трёх слуг, преданных вам. Это обычные люди, которые выполняют повседневные задачи, но не сражаются за вас и не идут за вами в явно опасные места. Один из них — оруженосец; двое ухаживают за конём и доспехом. Вы можете добавить в снаряжение знамя или подарок дамы сердца."},{"slug":"pirate","name_ru":"Пират","skills":["athletics","perception"],"skill_choices":null,"tools":["Инструменты навигатора","Транспорт (водный)"],"languages_choose":0,"feature_name_ru":"Дурная репутация","feature_text_ru":"Где бы вы ни оказались, вас боятся из-за вашей репутации. Находясь в цивилизованном поселении, вы можете безнаказанно совершать небольшие преступления, такие как отказ платить за еду в таверне или выламывание двери в магазине, так как жители боятся сообщать о вас властям."}],"feats":[{"slug":"alert","name_ru":"Бдительный","prerequisites_ru":null,"summary_ru":"Всегда начеку: инициатива и нельзя застать врасплох.","benefits_ru":"Получаете бонус +5 к инициативе. Вас нельзя застать врасплох, пока вы в сознании. Другие существа не получают преимущество на броски атаки по вам в результате того, что вы их не видите.","choices":[]},{"slug":"athlete","name_ru":"Атлет","prerequisites_ru":"Сил или Лов 1+","summary_ru":"+1 Сил или Лов; лучше встаёте, лазаете и прыгаете.","benefits_ru":"Увеличьте значение Силы или Ловкости на 1, максимум 20. Если вы лежите ничком, вставание требует всего 5 футов перемещения. Лазание не требует дополнительного перемещения. Вы можете совершать прыжок в длину с короткого разбега (не менее 5 футов) и прыжок в высоту с короткого разбега.","choices":[{"id":"ability","type":"ability_one","amount":1,"from":["str","dex"],"label_ru":"+1 к Силе или Ловкости"}]},{"slug":"actor","name_ru":"Актёр","prerequisites_ru":null,"summary_ru":"+1 Хар; лучше прикидываетесь кем-то другим.","benefits_ru":"Увеличьте Харизму на 1, максимум 20. Получаете преимущество на проверки Харизмы (Обман) и Харизмы (Выступление), когда выдаёте себя за другое лицо. Вы можете мимикрировать речь другого существа после слышания его голоса не менее 1 минуты; успешная проверка Мудрости (Проницательность) против вашей Харизмы (Обман) позволяет распознать обман.","choices":[]},{"slug":"charger","name_ru":"Налётчик","prerequisites_ru":null,"summary_ru":"После рывка можете ударить или толкнуть бонусным действием.","benefits_ru":"Если вы действием совершаете рывок, можете бонусным действием совершить одну рукопашную атаку оружием или толкнуть существо. Если перед атакой/толчком вы переместились минимум на 10 футов по прямой, получаете +5 к урону атаки или толкаете на 10 футов.","choices":[]},{"slug":"crossbow_expert","name_ru":"Эксперт в арбалетах","prerequisites_ru":null,"summary_ru":"Стреляете арбалетом в упор и перезаряжаете одной рукой.","benefits_ru":"Игнорируете свойство «перезарядка» у арбалетов, которыми владеете. Нахождение в пределах 5 футов от враждебного существа не даёт вам помеху на дальнобойные атаки. Когда атакуете рукопашным оружием, можете бонусным действием атаковать ручным арбалетом.","choices":[]},{"slug":"defensive_duelist","name_ru":"Оборонительный дуэлянт","prerequisites_ru":"Лов 13+","summary_ru":"Реакцией добавляете бонус мастерства к КД против рукопашной атаки.","benefits_ru":"Если вы держите фехтовальное оружие, которым владеете, и по вам попадают рукопашной атакой, можете реакцией добавить бонус мастерства к КД против этой атаки, потенциально обратив попадание в промах.","choices":[]},{"slug":"dual_wielder","name_ru":"Мастер двуоружия","prerequisites_ru":null,"summary_ru":"+1 КД при двух оружиях; можно брать нелёгкое оружие во вторую руку.","benefits_ru":"Получаете +1 к КД, пока держите отдельное рукопашное оружие в каждой руке. Можете использовать двуоружный бой даже если одно оружие не обладает свойством «лёгкое». Можете доставать или убирать два одноручных оружия, когда обычно достаёте или убираете одно.","choices":[]},{"slug":"dungeon_delver","name_ru":"Исследователь подземелий","prerequisites_ru":null,"summary_ru":"Лучше замечаете ловушки и скрытые двери; устойчивы к ловушкам.","benefits_ru":"Преимущество на Мудрость (Внимательность) и Интеллект (Анализ) для поиска скрытых дверей. Преимущество на спасброски против ловушек. Сопротивление урону от ловушек. Поиск ловушек и скрытых дверей на обычной скорости не замедляет вас.","choices":[]},{"slug":"durable","name_ru":"Стойкий","prerequisites_ru":null,"summary_ru":"Durable: +1 Тел; кости хитов лечат не меньше удвоенного модификатора Тел. (Не путать с «Крепкий» / Tough — +2 HP за уровень.)","benefits_ru":"Увеличьте Телосложение на 1, максимум 20. Когда вы бросаете Кость Хитов для восстановления хитов, минимум равен удвоенному модификатору Телосложения (минимум 2).","choices":[]},{"slug":"elemental_adept","name_ru":"Стихийный адепт","prerequisites_ru":"Умение накладывать хотя бы одно заклинание","summary_ru":"Выберите тип стихии: игнор сопротивления и «1» на костях урона → 2.","benefits_ru":"Выберите тип урона: кислота, холод, огонь, электричество или звук. Заклинания, накладываемые вами, игнорируют сопротивление к выбранному типу. При броске урона такого типа для заклинания считайте 1 на кости как 2. Черту можно брать повторно для другого типа.","choices":[{"id":"element","type":"enum","label_ru":"Тип урона","options":[{"id":"acid","label_ru":"Кислота"},{"id":"cold","label_ru":"Холод"},{"id":"fire","label_ru":"Огонь"},{"id":"lightning","label_ru":"Электричество"},{"id":"thunder","label_ru":"Звук"}]}]},{"slug":"grappler","name_ru":"Борец","prerequisites_ru":"Сил 13+","summary_ru":"Преимущество на атаки по схваченному; можете попытаться сбить с ног.","benefits_ru":"Преимущество на броски атаки по существу, которое вы схватили. Можете действием попытаться скрутить схваченное существо: успешная проверка Атлетики против Атлетики/Акробатики цели — и вы оба становитесь опутаны.","choices":[]},{"slug":"great_weapon_master","name_ru":"Мастер большого оружия","prerequisites_ru":null,"summary_ru":"Крит/убийство → бонусная атака; −5 к попаданию / +10 к урону тяжёлым оружием.","benefits_ru":"В свой ход, когда критическим ударом попадаете по существу или снижаете его хиты до 0 рукопашным оружием, можете бонусным действием совершить ещё одну рукопашную атаку оружием. Перед атакой рукопашным оружием со свойством «тяжёлое», которым владеете, можете принять штраф −5 к броску атаки; при попадании добавляете +10 к урону.","choices":[]},{"slug":"healer","name_ru":"Целитель","prerequisites_ru":null,"summary_ru":"Стабилизируете и лечите комплектом целителя эффективнее.","benefits_ru":"Когда используете комплект целителя для стабилизации, цель восстанавливает 1 хит. Действием можете потратить использование комплекта целителя, чтобы восстановить 1к6 + 4 + число Костей Хитов цели хитов (существо может получать это исцеление один раз за отдых).","choices":[]},{"slug":"heavily_armored","name_ru":"Тяжелобронированный","prerequisites_ru":"Владение средними доспехами","summary_ru":"+1 Сил; владение тяжёлыми доспехами.","benefits_ru":"Увеличьте Силу на 1, максимум 20. Получаете владение тяжёлыми доспехами.","choices":[]},{"slug":"heavy_armor_master","name_ru":"Мастер тяжёлых доспехов","prerequisites_ru":"Владение тяжёлыми доспехами","summary_ru":"+1 Сил; −3 к дробящему/колющему/рубящему урону не-магического оружия в тяжёлом доспехе.","benefits_ru":"Увеличьте Силу на 1, максимум 20. Пока носите тяжёлый доспех, дробящий, колющий и рубящий урон от немагического оружия по вам снижается на 3.","choices":[]},{"slug":"inspiring_leader","name_ru":"Вдохновляющий лидер","prerequisites_ru":"Хар 13+","summary_ru":"10-минутная речь даёт временные хиты вам и союзникам.","benefits_ru":"Можете потратить 10 минут на воодушевление спутников. Выберите до шести дружественных существ (можно себя) в пределах 30 футов, которые видят или слышат вас: каждое получает временные хиты = ваш уровень + модификатор Харизмы. Существо не может снова получить эти временные хиты, пока не завершит короткий или длинный отдых.","choices":[]},{"slug":"keen_mind","name_ru":"Острый ум","prerequisites_ru":null,"summary_ru":"+1 Инт; всегда знаете север, время; отличная память.","benefits_ru":"Увеличьте Интеллект на 1, максимум 20. Всегда знаете, где север. Всегда знаете количество часов до следующего восхода/заката. Можете точно вспомнить всё виденное или слышанное за последний месяц.","choices":[]},{"slug":"lightly_armored","name_ru":"Легкобронированный","prerequisites_ru":null,"summary_ru":"+1 Сил или Лов; владение лёгкими доспехами.","benefits_ru":"Увеличьте Силу или Ловкость на 1, максимум 20. Получаете владение лёгкими доспехами.","choices":[{"id":"ability","type":"ability_one","amount":1,"from":["str","dex"],"label_ru":"+1 к Силе или Ловкости"}]},{"slug":"linguist","name_ru":"Лингвист","prerequisites_ru":null,"summary_ru":"+1 Инт; три языка; можете создавать шифры.","benefits_ru":"Увеличьте Интеллект на 1, максимум 20. Выучите три языка на ваш выбор. Можете создавать письменные шифры; другие понимают их с проверкой Интеллекта (Сл = ваш бонус мастерства + модификатор Интеллекта) или магией.","choices":[{"id":"languages","type":"languages","count":3,"label_ru":"Три языка"}]},{"slug":"lucky","name_ru":"Везучий","prerequisites_ru":null,"summary_ru":"Три очка удачи на переброс к20 за себя или против вас.","benefits_ru":"У вас есть 3 очка удачи. Когда у вас есть очко удачи, можете потратить его, чтобы бросить дополнительный к20 при проверке характеристики, атаке или спасброске, и выбрать какой использовать. Можно тратить очко, когда по вам атакуют — бросаете к20 и выбираете, какой использует атакующий. Восстанавливаете все очки после длинного отдыха.","choices":[]},{"slug":"mage_slayer","name_ru":"Убийца магов","prerequisites_ru":null,"summary_ru":"Бьёте кастера рядом реакцией; помеха на концентрацию рядом с вами.","benefits_ru":"Когда существо в пределах 5 футов от вас накладывает заклинание, можете реакцией совершить рукопашную атаку оружием по этому существу. Когда повреждаете существо, концентрирующееся на заклинании, оно совершает спасбросок концентрации с помехой. Получаете преимущество на спасброски против заклинаний существ в пределах 5 футов.","choices":[]},{"slug":"magic_initiate","name_ru":"Посвящённый в магию","prerequisites_ru":null,"summary_ru":"Два заговора и одно заклинание 1 круга из списка барда/жреца/друида/колдуна/волшебника.","benefits_ru":"Выберите класс: бард, жрец, друид, колдун или волшебник. Выучите два заговора на ваш выбор из списка этого класса. Также выучите одно заклинание 1 уровня; можете накладывать его один раз без ячейки и должны завершить длинный отдых, чтобы наложить снова таким образом. Характеристика сотворения — от выбранного класса (Хар для барда/колдуна, Муд для жреца/друида, Инт для волшебника).","choices":[{"id":"list","type":"enum","label_ru":"Список заклинаний","options":[{"id":"bard","label_ru":"Бард (Хар)"},{"id":"cleric","label_ru":"Жрец (Муд)"},{"id":"druid","label_ru":"Друид (Муд)"},{"id":"warlock","label_ru":"Колдун (Хар)"},{"id":"wizard","label_ru":"Волшебник (Инт)"}]},{"id":"cantrip1","type":"spell_one","label_ru":"Заговор 1","level":0,"grant":"innate","filter_enum":"list","unique_group":"cantrips","options":[],"options_from":"class_spell_list"},{"id":"cantrip2","type":"spell_one","label_ru":"Заговор 2","level":0,"grant":"innate","filter_enum":"list","unique_group":"cantrips","options":[],"options_from":"class_spell_list"},{"id":"l1_spell","type":"spell_one","label_ru":"Заклинание 1 круга","level":1,"grant":"innate","filter_enum":"list","notes_ru":"1/длинный отдых без ячейки","options":[],"options_from":"class_spell_list"}]},{"slug":"martial_adept","name_ru":"Боевой адепт","prerequisites_ru":null,"summary_ru":"Два приёма мастера боевых искусств и одна кость превосходства d6.","benefits_ru":"Выучите два приёма на ваш выбор из списка мастера боевых искусств. Если уже есть кости превосходства, они используются для этих приёмов; иначе получаете одну кость превосходства d6 (восстанавливается после короткого или длинного отдыха). Кость увеличивается только если у вас уже есть кости превосходства большего размера.","choices":[{"id":"maneuvers","type":"enum_multi","label_ru":"Приёмы мастера боевых искусств","count":2,"options":[{"id":"commanders_strike","label_ru":"Удар командира"},{"id":"disarming_attack","label_ru":"Обезоруживающая атака"},{"id":"distracting_strike","label_ru":"Отвлекающий удар"},{"id":"evasive_footwork","label_ru":"Уклончивая работа ног"},{"id":"feinting_attack","label_ru":"Обманная атака"},{"id":"goading_attack","label_ru":"Провокационная атака"},{"id":"lunging_attack","label_ru":"Выпад"},{"id":"maneuvering_attack","label_ru":"Маневренная атака"},{"id":"menacing_attack","label_ru":"Устрашающая атака"},{"id":"parry","label_ru":"Парирование"},{"id":"precision_attack","label_ru":"Точная атака"},{"id":"pushing_attack","label_ru":"Отталкивающая атака"},{"id":"rally","label_ru":"Сплочение"},{"id":"riposte","label_ru":"Ответный удар"},{"id":"sweeping_attack","label_ru":"Сметающая атака"},{"id":"trip_attack","label_ru":"Атака с подножкой"}]}]},{"slug":"medium_armor_master","name_ru":"Мастер средних доспехов","prerequisites_ru":"Владение средними доспехами","summary_ru":"В среднем доспехе: без помехи Скрытности (если доспех не даёт); Лов к КД до +3.","benefits_ru":"Ношение среднего доспеха, которым владеете, не даёт помеху на Ловкость (Скрытность). Когда носите средний доспех, можете добавлять 3, а не 2, к КД, если Ловкость 16+.","choices":[]},{"slug":"mobile","name_ru":"Подвижный","prerequisites_ru":null,"summary_ru":"+10 скорости; рывок без труднопроходимой местности; удары снимают провоцированные.","benefits_ru":"Скорость увеличивается на 10 футов. Когда используете действие Рывок, труднопроходимая местность в этом ходу не отнимает лишнее перемещение. После рукопашной атаки по существу (попадание не обязательно) до конца хода не провоцируете атаки от него.","choices":[]},{"slug":"moderately_armored","name_ru":"Среднебронированный","prerequisites_ru":"Владение лёгкими доспехами","summary_ru":"+1 Сил или Лов; владение средними доспехами и щитами.","benefits_ru":"Увеличьте Силу или Ловкость на 1, максимум 20. Получаете владение средними доспехами и щитами.","choices":[{"id":"ability","type":"ability_one","amount":1,"from":["str","dex"],"label_ru":"+1 к Силе или Ловкости"}]},{"slug":"mounted_combatant","name_ru":"Верховой боец","prerequisites_ru":null,"summary_ru":"Преимущество на атаки по меньшим пешим; уводите удары на себя; скакун ловчее уворачивается.","benefits_ru":"Преимущество на броски рукопашной атаки по немассивным существам, которые меньше вашего скакуна и не верхом. Можете заставить атаку, нацеленную на скакуна, нацелиться на вас. Если скакун должен преуспеть в спасброске Ловкости только наполовину урона — он не получает урона при успехе и половину при провале.","choices":[]},{"slug":"observant","name_ru":"Наблюдательный","prerequisites_ru":null,"summary_ru":"+1 Инт или Муд; +5 к пассивным Внимательности и Анализу; читаете по губам.","benefits_ru":"Увеличьте Интеллект или Мудрость на 1, максимум 20. Если видите рот говорящего на понятном языке и он в пределах видимости — можете понять, что говорится, считывая по губам. Получаете бонус +5 к пассивным проверкам Мудрости (Внимательность) и Интеллекта (Анализ).","choices":[{"id":"ability","type":"ability_one","amount":1,"from":["int","wis"],"label_ru":"+1 к Интеллекту или Мудрости"}]},{"slug":"polearm_master","name_ru":"Мастер древкового оружия","prerequisites_ru":null,"summary_ru":"Бонусный удар противоположным концом; провокации на вход в досягаемость.","benefits_ru":"Когда действием атакуете только глефой, алебардой, боевым посохом или копьём, можете бонусным действием ударить противоположным концом: 1к4 дробящего, свойства оружия те же. Пока держите такое оружие, существа провоцируют атаку, когда входят в вашу досягаемость.","choices":[]},{"slug":"resilient","name_ru":"Устойчивый","prerequisites_ru":null,"summary_ru":"+1 к выбранной характеристике и владение её спасброском.","benefits_ru":"Выберите одну характеристику. Увеличьте её на 1, максимум 20. Получаете владение спасбросками этой характеристики.","choices":[{"id":"ability","type":"ability_one","amount":1,"from":["str","dex","con","int","wis","cha"],"label_ru":"Характеристика (+1 и спасбросок)"}]},{"slug":"ritual_caster","name_ru":"Заклинатель ритуалов","prerequisites_ru":"Инт или Муд 13+","summary_ru":"Книга ритуалов: два ритуала 1 круга; можете переписывать новые.","benefits_ru":"Предпосылка: Инт или Муд 13+. Вы получаете книгу ритуалов со двумя заклинаниями 1 круга со свойством «ритуал» из списка барда, жреца, друида, чародея, колдуна или волшебника. Характеристика сотворения — у списка (Хар у барда, чародея и колдуна; Муд у жреца и друида; Инт у волшебника). Каст только ритуалом. Найденный ритуал того же списка вписывается за 2 часа и 50 зм за круг, не выше половины уровня.","choices":[{"id":"ability","type":"ability_one","amount":0,"from":["int","wis"],"label_ru":"Характеристика сотворения (Инт или Муд 13+)"},{"id":"list","type":"enum","label_ru":"Список","options":[{"id":"bard","label_ru":"Бард"},{"id":"cleric","label_ru":"Жрец"},{"id":"druid","label_ru":"Друид"},{"id":"sorcerer","label_ru":"Чародей"},{"id":"warlock","label_ru":"Колдун"},{"id":"wizard","label_ru":"Волшебник"}]},{"id":"ritual1","type":"spell_one","label_ru":"Ритуал 1","level":1,"grant":"innate","filter_enum":"list","unique_group":"rituals","notes_ru":"ритуал (книга ритуалов)","options":[],"options_from":"class_ritual_list"},{"id":"ritual2","type":"spell_one","label_ru":"Ритуал 2","level":1,"grant":"innate","filter_enum":"list","unique_group":"rituals","notes_ru":"ритуал (книга ритуалов)","options":[],"options_from":"class_ritual_list"}]},{"slug":"savage_attacker","name_ru":"Свирепый атакующий","prerequisites_ru":null,"summary_ru":"Раз за ход перебрасываете кости урона рукопашной атаки оружием.","benefits_ru":"Один раз в ход, когда бросаете кости урона для рукопашной атаки оружием, можете перебросить кости урона оружия и использовать любой результат.","choices":[]},{"slug":"sentinel","name_ru":"Страж","prerequisites_ru":null,"summary_ru":"Провокации бьют даже при Отходе; останавливаете скорость; караете удар по союзнику.","benefits_ru":"Когда попадаете атакой по возможности, скорость цели становится 0 до конца текущего хода. Существа провоцируют ваши атаки даже если используют Отход. Когда существо в пределах 5 футов от вас атакует не вас (и не имеет этой черты), можете реакцией совершить рукопашную атаку оружием по атакующему.","choices":[]},{"slug":"sharpshooter","name_ru":"Меткий стрелок","prerequisites_ru":null,"summary_ru":"Дальнобойные атаки без штрафа на дальней дистанции; −5/+10; игнор укрытия ½ и ¾.","benefits_ru":"Атакуя дальнобойным оружием, игнорируете помеху на дальней дистанции. Ваши дальнобойные атаки оружием игнорируют укрытие на половину и на три четверти. Перед атакой дальнобойным оружием, которым владеете, можете принять −5 к броску атаки; при попадании +10 к урону.","choices":[]},{"slug":"shield_master","name_ru":"Мастер щита","prerequisites_ru":null,"summary_ru":"Бонусный толчок щитом; лучше спасброски Лов; щит как укрытие от спасброска Лов.","benefits_ru":"Если в ход атакуете действием, можете бонусным действием толкнуть щитом существо в пределах 5 футов. Если не выведены из строя и несёте щит, к спасброску Ловкости, чтобы получить только половину урона, можете реакцией не получить урона при успехе. Если эффект делает спасбросок Ловкости только на вас, можете добавить бонус щита к спасброску.","choices":[]},{"slug":"skilled","name_ru":"Умелый","prerequisites_ru":null,"summary_ru":"Владение любыми тремя навыками или инструментами.","benefits_ru":"Вы получаете владение любыми комбинациями из трёх навыков или инструментов на ваш выбор.","choices":[{"id":"proficiencies","type":"skill_or_tool","count":3,"label_ru":"Три навыка или инструмента"}]},{"slug":"skulker","name_ru":"Скрытный","prerequisites_ru":"Лов 13+","summary_ru":"Можете прятаться в лёгких укрытиях; промах дальнобойной не выдаёт; лучше в тусклом свете.","benefits_ru":"Можете пытаться спрятаться, когда легко затемнены. Когда промахиваетесь дальнобойной атакой, будучи спрятанным, атака не выдаёт вашу позицию. Тусклый свет не даёт помеху на зрение, полагающееся на зрение.","choices":[]},{"slug":"spell_sniper","name_ru":"Заклинательный снайпер","prerequisites_ru":"Умение накладывать хотя бы одно заклинание","summary_ru":"Удвоенная дальность атакующих заклинаний; игнор укрытия; один атакующий заговор.","benefits_ru":"Когда накладываете заклинание, требующее броска атаки, дальность заклинания удваивается. Дальнобойные атаки заклинаний игнорируют укрытие на половину и на три четверти. Выучите один заговор, требующий атаки, из списка барда, жреца, друида, колдуна, чародея или волшебника (характеристика — от выбранного списка).","choices":[{"id":"list","type":"enum","label_ru":"Список заговора","options":[{"id":"bard","label_ru":"Бард"},{"id":"cleric","label_ru":"Жрец"},{"id":"druid","label_ru":"Друид"},{"id":"sorcerer","label_ru":"Чародей"},{"id":"warlock","label_ru":"Колдун"},{"id":"wizard","label_ru":"Волшебник"}]},{"id":"cantrip","type":"spell_one","label_ru":"Атакующий заговор","level":0,"grant":"innate","filter_enum":"list","notes_ru":"атакующий заговор (Spell Sniper)","options":[{"id":"eldritch_blast","label_ru":"Мистический заряд","lists":["warlock"]},{"id":"fire_bolt","label_ru":"Огненный снаряд","lists":["sorcerer","wizard"]},{"id":"ray_of_frost","label_ru":"Луч холода","lists":["sorcerer","wizard"]},{"id":"shocking_grasp","label_ru":"Шокирующее касание","lists":["sorcerer","wizard"]},{"id":"chill_touch","label_ru":"Леденящее прикосновение","lists":["sorcerer","warlock","wizard"]},{"id":"sacred_flame","label_ru":"Священное пламя","lists":["cleric"]},{"id":"produce_flame","label_ru":"Сотворение пламени","lists":["druid"]},{"id":"thorn_whip","label_ru":"Терновый кнут","lists":["druid"]},{"id":"poison_spray","label_ru":"Ядовитые брызги","lists":["druid","sorcerer","warlock","wizard"]},{"id":"vicious_mockery","label_ru":"Злая насмешка","lists":["bard"]}]}]},{"slug":"tavern_brawler","name_ru":"Драчун","prerequisites_ru":null,"summary_ru":"+1 Сил или Тел; импровизированное оружие и захваты после удара.","benefits_ru":"Увеличьте Силу или Телосложение на 1, максимум 20. Владеете импровизированным оружием. Безоружный удар: 1к4. Когда попадаете безоружным ударом или импровизированным оружием в свой ход, можете бонусным действием попытаться схватить цель.","choices":[{"id":"ability","type":"ability_one","amount":1,"from":["str","con"],"label_ru":"+1 к Силе или Телосложению"}]},{"slug":"tough","name_ru":"Крепкий","prerequisites_ru":null,"summary_ru":"Tough: +2 к максимуму хитов за каждый уровень (включая прошлые и будущие). На 2 ур. = +4 HP.","benefits_ru":"Максимум хитов увеличивается на 2 за каждый уровень, который у вас есть. Каждый раз, когда вы получаете уровень после этого, максимум хитов дополнительно увеличивается на 2.","choices":[]},{"slug":"war_caster","name_ru":"Боевой заклинатель","prerequisites_ru":"Умение накладывать хотя бы одно заклинание","summary_ru":"Преимущество на концентрацию; соматика со щитом/оружием; провокация заклинанием.","benefits_ru":"Преимущество на спасброски Телосложения для концентрации. Можете выполнять соматические компоненты даже с оружием или щитом в руках. Когда существо провоцирует атаку по возможности, можете реакцией наложить на него заклинание вместо атаки: время накладывания — действие, цель — только это существо.","choices":[]},{"slug":"weapon_master","name_ru":"Мастер оружия","prerequisites_ru":null,"summary_ru":"+1 Сил или Лов; владение четырьмя видами оружия.","benefits_ru":"Увеличьте Силу или Ловкость на 1, максимум 20. Получаете владение четырьмя видами простого или воинского оружия на ваш выбор.","choices":[{"id":"ability","type":"ability_one","amount":1,"from":["str","dex"],"label_ru":"+1 к Силе или Ловкости"},{"id":"weapons","type":"weapons","count":4,"label_ru":"Четыре вида оружия"}]}],"wizardSpells":[{"slug":"sword_burst","name_ru":"Вспышка мечей","level":0,"school":"conjuration","source_book":"TCE"},{"slug":"booming_blade","name_ru":"Громовой клинок","level":0,"school":"evocation","source_book":"TCE"},{"slug":"friends","name_ru":"Дружба","level":0,"school":"enchantment","source_book":"PHB"},{"slug":"blade_ward","name_ru":"Защита от оружия","level":0,"school":"abjuration","source_book":"PHB"},{"slug":"green_flame_blade","name_ru":"Клинок зелёного пламени","level":0,"school":"evocation","source_book":"TCE"},{"slug":"lightning_lure","name_ru":"Лассо молнии","level":0,"school":"evocation","source_book":"TCE"},{"slug":"mind_sliver","name_ru":"Расщепление разума","level":0,"school":"enchantment","source_book":"TCE"},{"slug":"acid_splash","name_ru":"Брызги кислоты","level":0,"school":"conjuration","source_book":"PHB"},{"slug":"chill_touch","name_ru":"Леденящее прикосновение","level":0,"school":"necromancy","source_book":"PHB"},{"slug":"dancing_lights","name_ru":"Пляшущие огоньки","level":0,"school":"evocation","source_book":"PHB"},{"slug":"fire_bolt","name_ru":"Огненный снаряд","level":0,"school":"evocation","source_book":"PHB"},{"slug":"light","name_ru":"Свет","level":0,"school":"evocation","source_book":"PHB"},{"slug":"mage_hand","name_ru":"Волшебная рука","level":0,"school":"conjuration","source_book":"PHB"},{"slug":"mending","name_ru":"Починка","level":0,"school":"transmutation","source_book":"PHB"},{"slug":"message","name_ru":"Сообщение","level":0,"school":"transmutation","source_book":"PHB"},{"slug":"minor_illusion","name_ru":"Малая иллюзия","level":0,"school":"illusion","source_book":"PHB"},{"slug":"poison_spray","name_ru":"Ядовитые брызги","level":0,"school":"conjuration","source_book":"PHB"},{"slug":"prestidigitation","name_ru":"Фокусы","level":0,"school":"transmutation","source_book":"PHB"},{"slug":"ray_of_frost","name_ru":"Луч холода","level":0,"school":"evocation","source_book":"PHB"},{"slug":"shocking_grasp","name_ru":"Электрошок","level":0,"school":"evocation","source_book":"PHB"},{"slug":"true_strike","name_ru":"Меткий удар","level":0,"school":"divination","source_book":"PHB"},{"slug":"silent_image","name_ru":"Безмолвный образ","level":1,"school":"illusion"},{"slug":"witch_bolt","name_ru":"Ведьмин снаряд","level":1,"school":"evocation"},{"slug":"thunderwave","name_ru":"Волна грома","level":1,"school":"evocation"},{"slug":"magic_missile","name_ru":"Волшебная стрела","level":1,"school":"evocation"},{"slug":"mage_armor","name_ru":"Доспехи мага","level":1,"school":"abjuration"},{"slug":"hideous_laughter","name_ru":"Жуткий смех Таши","level":1,"school":"enchantment"},{"slug":"protection_from_evil_and_good","name_ru":"Защита от зла и добра","level":1,"school":"abjuration"},{"slug":"ray_of_sickness","name_ru":"Луч болезни","level":1,"school":"necromancy"},{"slug":"disguise_self","name_ru":"Маскировка","level":1,"school":"illusion"},{"slug":"illusory_script","name_ru":"Невидимое письмо","level":1,"school":"illusion"},{"slug":"unseen_servant","name_ru":"Невидимый слуга","level":1,"school":"conjuration"},{"slug":"detect_magic","name_ru":"Обнаружение магии","level":1,"school":"divination"},{"slug":"burning_hands","name_ru":"Огненные ладони","level":1,"school":"evocation"},{"slug":"identify","name_ru":"Опознание","level":1,"school":"divination"},{"slug":"charm_person","name_ru":"Очарование личности","level":1,"school":"enchantment"},{"slug":"feather_fall","name_ru":"Падение пёрышком","level":1,"school":"transmutation"},{"slug":"find_familiar","name_ru":"Поиск фамильяра","level":1,"school":"conjuration"},{"slug":"comprehend_languages","name_ru":"Понимание языков","level":1,"school":"divination"},{"slug":"expeditious_retreat","name_ru":"Поспешное отступление","level":1,"school":"transmutation"},{"slug":"jump","name_ru":"Прыжок","level":1,"school":"transmutation"},{"slug":"false_life","name_ru":"Псевдожизнь","level":1,"school":"necromancy"},{"slug":"color_spray","name_ru":"Сверкающие брызги","level":1,"school":"illusion"},{"slug":"alarm","name_ru":"Сигнал тревоги","level":1,"school":"abjuration"},{"slug":"grease","name_ru":"Скольжение","level":1,"school":"conjuration"},{"slug":"longstrider","name_ru":"Скороход","level":1,"school":"transmutation"},{"slug":"floating_disk","name_ru":"Тензеров парящий диск","level":1,"school":"conjuration"},{"slug":"fog_cloud","name_ru":"Туманное облако","level":1,"school":"conjuration"},{"slug":"sleep","name_ru":"Усыпление","level":1,"school":"enchantment"},{"slug":"chromatic_orb","name_ru":"Цветной шарик","level":1,"school":"evocation"},{"slug":"shield","name_ru":"Щит","level":1,"school":"abjuration"},{"slug":"continual_flame","name_ru":"Вечный огонь","level":2,"school":"evocation"},{"slug":"see_invisibility","name_ru":"Видение невидимого","level":2,"school":"divination"},{"slug":"suggestion","name_ru":"Внушение","level":2,"school":"enchantment"},{"slug":"magic_mouth","name_ru":"Волшебные уста","level":2,"school":"illusion"},{"slug":"arcane_lock","name_ru":"Волшебный замок","level":2,"school":"abjuration"},{"slug":"phantasmal_force","name_ru":"Воображаемая сила","level":2,"school":"illusion"},{"slug":"blindness_deafness","name_ru":"Глухота","level":2,"school":"necromancy"},{"slug":"shatter","name_ru":"Дребезги","level":2,"school":"evocation"},{"slug":"crown_of_madness","name_ru":"Корона безумия","level":2,"school":"enchantment"},{"slug":"levitate","name_ru":"Левитация","level":2,"school":"transmutation"},{"slug":"ray_of_enfeeblement","name_ru":"Луч слабости","level":2,"school":"necromancy"},{"slug":"magic_weapon","name_ru":"Магическое оружие","level":2,"school":"transmutation"},{"slug":"acid_arrow","name_ru":"Мельфова кислотная стрела","level":2,"school":"evocation"},{"slug":"invisibility","name_ru":"Невидимость","level":2,"school":"illusion"},{"slug":"gentle_repose","name_ru":"Нетленные останки","level":2,"school":"necromancy"},{"slug":"nystul_s_magic_aura","name_ru":"Нистулова ложная аура","level":2,"school":"illusion"},{"slug":"cloud_of_daggers","name_ru":"Облако кинжалов","level":2,"school":"conjuration"},{"slug":"detect_thoughts","name_ru":"Обнаружение мыслей","level":2,"school":"divination"},{"slug":"knock","name_ru":"Открывание","level":2,"school":"transmutation"},{"slug":"mirror_image","name_ru":"Отражения","level":2,"school":"illusion"},{"slug":"scorching_ray","name_ru":"Палящий луч","level":2,"school":"evocation"},{"slug":"spider_climb","name_ru":"Паук","level":2,"school":"transmutation"},{"slug":"web","name_ru":"Паутина","level":2,"school":"conjuration"},{"slug":"locate_object","name_ru":"Поиск предмета","level":2,"school":"divination"},{"slug":"gust_of_wind","name_ru":"Порыв ветра","level":2,"school":"evocation"},{"slug":"flaming_sphere","name_ru":"Пылающий шар","level":2,"school":"conjuration"},{"slug":"blur","name_ru":"Размытый образ","level":2,"school":"illusion"},{"slug":"alter_self","name_ru":"Смена обличья","level":2,"school":"transmutation"},{"slug":"rope_trick","name_ru":"Трюк с верёвкой","level":2,"school":"transmutation"},{"slug":"misty_step","name_ru":"Туманный шаг","level":2,"school":"conjuration"},{"slug":"darkness","name_ru":"Тьма","level":2,"school":"evocation"},{"slug":"darkvision","name_ru":"Тёмное зрение","level":2,"school":"transmutation"},{"slug":"enlarge_reduce","name_ru":"Увеличение","level":2,"school":"transmutation"},{"slug":"hold_person","name_ru":"Удержание личности","level":2,"school":"enchantment"},{"slug":"animate_dead","name_ru":"Восставший труп","level":3,"school":"necromancy"},{"slug":"gaseous_form","name_ru":"Газообразная форма","level":3,"school":"transmutation"},{"slug":"hypnotic_pattern","name_ru":"Гипнотический узор","level":3,"school":"illusion"},{"slug":"slow","name_ru":"Замедление","level":3,"school":"transmutation"},{"slug":"protection_from_energy","name_ru":"Защита от энергии","level":3,"school":"abjuration"},{"slug":"stinking_cloud","name_ru":"Зловонное облако","level":3,"school":"conjuration"},{"slug":"counterspell","name_ru":"Контрзаклинание","level":3,"school":"abjuration"},{"slug":"tiny_hut","name_ru":"Леомундова хижина","level":3,"school":"evocation"},{"slug":"magic_circle","name_ru":"Магический круг","level":3,"school":"abjuration"},{"slug":"blink","name_ru":"Мерцание","level":3,"school":"transmutation"},{"slug":"sleet_storm","name_ru":"Метель","level":3,"school":"conjuration"},{"slug":"lightning_bolt","name_ru":"Молния","level":3,"school":"evocation"},{"slug":"nondetection","name_ru":"Необнаружимость","level":3,"school":"abjuration"},{"slug":"major_image","name_ru":"Образ","level":3,"school":"illusion"},{"slug":"fireball","name_ru":"Огненный шар","level":3,"school":"evocation"},{"slug":"glyph_of_warding","name_ru":"Охранная руна","level":3,"school":"abjuration"},{"slug":"water_breathing","name_ru":"Подводное дыхание","level":3,"school":"transmutation"},{"slug":"clairvoyance","name_ru":"Подсматривание","level":3,"school":"divination"},{"slug":"fly","name_ru":"Полёт","level":3,"school":"transmutation"},{"slug":"sending","name_ru":"Послание","level":3,"school":"evocation"},{"slug":"phantom_steed","name_ru":"Призрачный скакун","level":3,"school":"illusion"},{"slug":"vampiric_touch","name_ru":"Прикосновение вампира","level":3,"school":"necromancy"},{"slug":"feign_death","name_ru":"Притворная смерть","level":3,"school":"necromancy"},{"slug":"bestow_curse","name_ru":"Проклятие","level":3,"school":"necromancy"},{"slug":"dispel_magic","name_ru":"Рассеивание магии","level":3,"school":"abjuration"},{"slug":"remove_curse","name_ru":"Снятие проклятия","level":3,"school":"abjuration"},{"slug":"fear","name_ru":"Ужас","level":3,"school":"illusion"},{"slug":"haste","name_ru":"Ускорение","level":3,"school":"transmutation"},{"slug":"tongues","name_ru":"Языки","level":3,"school":"divination"},{"slug":"faithful_hound","name_ru":"Верный пёс Морденкайнена","level":4,"school":"conjuration"},{"slug":"control_water","name_ru":"Власть над водами","level":4,"school":"transmutation"},{"slug":"phantasmal_killer","name_ru":"Воображаемый убийца","level":4,"school":"illusion"},{"slug":"greater_invisibility","name_ru":"Высшая невидимость","level":4,"school":"illusion"},{"slug":"ice_storm","name_ru":"Град","level":4,"school":"evocation"},{"slug":"banishment","name_ru":"Изгнание","level":4,"school":"abjuration"},{"slug":"fabricate","name_ru":"Изготовление","level":4,"school":"transmutation"},{"slug":"stone_shape","name_ru":"Изменение формы камня","level":4,"school":"transmutation"},{"slug":"private_sanctum","name_ru":"Кабинет Морденкайнена","level":4,"school":"abjuration"},{"slug":"stoneskin","name_ru":"Каменная кожа","level":4,"school":"abjuration"},{"slug":"secret_chest","name_ru":"Леомундов потайной сундук","level":4,"school":"conjuration"},{"slug":"arcane_eye","name_ru":"Магический глаз","level":4,"school":"divination"},{"slug":"hallucinatory_terrain","name_ru":"Мираж","level":4,"school":"illusion"},{"slug":"wall_of_fire","name_ru":"Огненная стена","level":4,"school":"evocation"},{"slug":"fire_shield","name_ru":"Огненный щит","level":4,"school":"evocation"},{"slug":"resilient_sphere","name_ru":"Отилюков упругий шар","level":4,"school":"evocation"},{"slug":"dimension_door","name_ru":"Переносящая дверь","level":4,"school":"conjuration"},{"slug":"locate_creature","name_ru":"Поиск существа","level":4,"school":"divination"},{"slug":"polymorph","name_ru":"Превращение","level":4,"school":"transmutation"},{"slug":"conjure_minor_elementals","name_ru":"Призыв малых элементалей","level":4,"school":"conjuration"},{"slug":"confusion","name_ru":"Смятение","level":4,"school":"enchantment"},{"slug":"blight","name_ru":"Усыхание","level":4,"school":"necromancy"},{"slug":"black_tentacles","name_ru":"Эвардовы чёрные щупальца","level":4,"school":"conjuration"},{"slug":"dream","name_ru":"Вещий сон","level":5,"school":"illusion"},{"slug":"bigby_s_hand","name_ru":"Длань Бигби","level":5,"school":"evocation"},{"slug":"legend_lore","name_ru":"Знание легенд","level":5,"school":"divination"},{"slug":"modify_memory","name_ru":"Изменение памяти","level":5,"school":"enchantment"},{"slug":"wall_of_stone","name_ru":"Каменная стена","level":5,"school":"evocation"},{"slug":"cone_of_cold","name_ru":"Конус холода","level":5,"school":"evocation"},{"slug":"teleportation_circle","name_ru":"Круг телепортации","level":5,"school":"conjuration"},{"slug":"telepathic_bond","name_ru":"Ментальная связь Рэри","level":5,"school":"divination"},{"slug":"scrying","name_ru":"Наблюдение","level":5,"school":"divination"},{"slug":"geas","name_ru":"Обет","level":5,"school":"enchantment"},{"slug":"cloudkill","name_ru":"Облако смерти","level":5,"school":"conjuration"},{"slug":"animate_objects","name_ru":"Оживление вещей","level":5,"school":"transmutation"},{"slug":"planar_binding","name_ru":"Планарные узы","level":5,"school":"abjuration"},{"slug":"dominate_person","name_ru":"Подчинение личности","level":5,"school":"enchantment"},{"slug":"conjure_elemental","name_ru":"Призыв элементаля","level":5,"school":"conjuration"},{"slug":"seeming","name_ru":"Притворство","level":5,"school":"illusion"},{"slug":"contact_other_plane","name_ru":"Связь с иным миром","level":5,"school":"divination"},{"slug":"wall_of_force","name_ru":"Силовая стена","level":5,"school":"evocation"},{"slug":"passwall","name_ru":"Создание прохода","level":5,"school":"transmutation"},{"slug":"creation","name_ru":"Сотворение","level":5,"school":"illusion"},{"slug":"telekinesis","name_ru":"Телекинез","level":5,"school":"transmutation"},{"slug":"hold_monster","name_ru":"Удержание чудовища","level":5,"school":"enchantment"},{"slug":"mislead","name_ru":"Фальшивый двойник","level":5,"school":"illusion"},{"slug":"magic_jar","name_ru":"Волшебный сосуд","level":6,"school":"necromancy"},{"slug":"move_earth","name_ru":"Движение почвы","level":6,"school":"transmutation"},{"slug":"instant_summons","name_ru":"Дромиджево появление","level":6,"school":"conjuration"},{"slug":"programmed_illusion","name_ru":"Заданная иллюзия","level":6,"school":"illusion"},{"slug":"true_seeing","name_ru":"Истинное зрение","level":6,"school":"divination"},{"slug":"circle_of_death","name_ru":"Круг смерти","level":6,"school":"necromancy"},{"slug":"wall_of_ice","name_ru":"Ледяная стена","level":6,"school":"evocation"},{"slug":"arcane_gate","name_ru":"Магические врата","level":6,"school":"conjuration"},{"slug":"mass_suggestion","name_ru":"Множественное внушение","level":6,"school":"enchantment"},{"slug":"irresistible_dance","name_ru":"Неудержимая пляска Отто","level":6,"school":"enchantment"},{"slug":"flesh_to_stone","name_ru":"Окаменение","level":6,"school":"transmutation"},{"slug":"freezing_sphere","name_ru":"Отилюков ледяной шар","level":6,"school":"evocation"},{"slug":"contingency","name_ru":"Предосторожность","level":6,"school":"evocation"},{"slug":"eyebite","name_ru":"Разящее око","level":6,"school":"necromancy"},{"slug":"disintegrate","name_ru":"Распад","level":6,"school":"transmutation"},{"slug":"sunbeam","name_ru":"Солнечный луч","level":6,"school":"evocation"},{"slug":"create_undead","name_ru":"Сотворение нежити","level":6,"school":"necromancy"},{"slug":"guards_and_wards","name_ru":"Стражи","level":6,"school":"abjuration"},{"slug":"globe_of_invulnerability","name_ru":"Сфера неуязвимости","level":6,"school":"abjuration"},{"slug":"chain_lightning","name_ru":"Цепная молния","level":6,"school":"evocation"}],"classMeta":{"cleric":{"name_ru":"Жрец","hit_die":8,"save":["wis","cha"],"skills_need":2,"skills":["history","insight","medicine","persuasion","religion"],"mc":["wis"]},"druid":{"name_ru":"Друид","hit_die":8,"save":["int","wis"],"skills_need":2,"skills":["arcana","animal","insight","medicine","nature","perception","religion","survival"],"mc":["wis"]},"wizard":{"name_ru":"Волшебник","hit_die":6,"save":["int","wis"],"skills_need":2,"skills":["arcana","history","insight","investigation","medicine","religion"],"mc":["int"]},"paladin":{"name_ru":"Паладин","hit_die":10,"save":["wis","cha"],"skills_need":2,"skills":["athletics","insight","intimidation","medicine","persuasion","religion"],"mc":["str","cha"]},"barbarian":{"name_ru":"Варвар","hit_die":12,"mc":["str"]},"bard":{"name_ru":"Бард","hit_die":8,"mc":["cha"]},"fighter":{"name_ru":"Воин","hit_die":10,"mc":["str_or_dex"]},"monk":{"name_ru":"Монах","hit_die":8,"mc":["dex","wis"]},"ranger":{"name_ru":"Следопыт","hit_die":10,"mc":["dex","wis"]},"rogue":{"name_ru":"Плут","hit_die":8,"mc":["dex"]},"sorcerer":{"name_ru":"Чародей","hit_die":6,"mc":["cha"]},"warlock":{"name_ru":"Колдун","hit_die":8,"mc":["cha"]}},"fightingStyles":[{"id":"defense","name_ru":"Защита","summary_ru":"Пока на тебе доспех, КД +1."},{"id":"dueling","name_ru":"Дуэлянт","summary_ru":"Когда держишь одно одноручное оружие ближнего боя и ничего во второй руке, урон этим оружием +2."},{"id":"great_weapon_fighting","name_ru":"Бой большим оружием","summary_ru":"Когда в двуручном или универсальном оружии в двух руках на 1 или 2 на кости урона, можешь перебросить эти кости и взять новый результат."},{"id":"protection","name_ru":"Охранение","summary_ru":"Когда существо, которое ты видишь, атакует цель не дальше 5 фт. от тебя (не тебя), реакцией наложи помеху на бросок атаки, если держишь щит."}],"transmuterStone":[{"id":"darkvision","name_ru":"Тёмное зрение","summary_ru":"Тёмное зрение 60 фт."},{"id":"speed","name_ru":"Скорость","summary_ru":"Скорость увеличивается на 10 фт., пока камень при тебе."},{"id":"con_save","name_ru":"Спас Телосложения","summary_ru":"Владение спасбросками Телосложения."},{"id":"resistance","name_ru":"Сопротивление","summary_ru":"Сопротивление урону кислотой, холодом, огнём, электричеством или звуком (на выбор при создании камня)."}],"fullSlots":{"1":[2],"2":[3],"3":[4,2],"4":[4,3],"5":[4,3,2],"6":[4,3,3],"7":[4,3,3,1],"8":[4,3,3,2],"9":[4,3,3,3,1],"10":[4,3,3,3,2],"11":[4,3,3,3,2,1],"12":[4,3,3,3,2,1],"13":[4,3,3,3,2,1,1],"14":[4,3,3,3,2,1,1],"15":[4,3,3,3,2,1,1,1],"16":[4,3,3,3,2,1,1,1],"17":[4,3,3,3,2,1,1,1,1],"18":[4,3,3,3,3,1,1,1,1],"19":[4,3,3,3,3,2,1,1,1],"20":[4,3,3,3,3,2,2,1,1]},"palSlots":{"2":[2],"3":[3],"4":[3],"5":[4,2],"6":[4,3],"7":[4,3],"8":[4,3],"9":[4,3,2],"10":[4,3,2],"11":[4,3,3],"12":[4,3,3],"13":[4,3,3,1],"14":[4,3,3,1],"15":[4,3,3,2],"16":[4,3,3,2],"17":[4,3,3,3,1],"18":[4,3,3,3,1],"19":[4,3,3,3,2],"20":[4,3,3,3,2]},"xp":[0,0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000],"equipment":{"cleric":[{"id":"melee","label_ru":"Оружие ближнего боя","options":[{"id":"mace","label_ru":"Булава"},{"id":"warhammer","label_ru":"Боевой молот"}]},{"id":"armor","label_ru":"Доспех","options":[{"id":"scale","label_ru":"Чешуйчатый доспех"},{"id":"leather","label_ru":"Кожаный доспех"},{"id":"chain","label_ru":"Кольчуга"}]},{"id":"ranged","label_ru":"Дальний бой / простое оружие","options":[{"id":"crossbow","label_ru":"Лёгкий арбалет и 20 болтов"},{"id":"any_simple","label_ru":"Любое простое оружие"}]},{"id":"pack","label_ru":"Набор","options":[{"id":"priest","label_ru":"Набор священника"},{"id":"explorer","label_ru":"Набор путешественника"}]}],"druid":[{"id":"armor","label_ru":"Защита","options":[{"id":"shield_scimitar","label_ru":"Деревянный щит"},{"id":"any_simple","label_ru":"Любое простое оружие"}]},{"id":"weapon","label_ru":"Оружие","options":[{"id":"scimitar","label_ru":"Скимитар"},{"id":"any_simple_melee","label_ru":"Любое простое оружие ближнего боя"}]},{"id":"pack","label_ru":"Набор","options":[{"id":"explorer","label_ru":"Набор путешественника"}]}],"wizard":[{"id":"weapon","label_ru":"Оружие","options":[{"id":"quarterstaff","label_ru":"Посох"},{"id":"dagger","label_ru":"Кинжал"}]},{"id":"pack","label_ru":"Набор","options":[{"id":"scholar","label_ru":"Набор учёного"},{"id":"explorer","label_ru":"Набор путешественника"}]}],"paladin":[{"id":"weapon","label_ru":"Оружие","options":[{"id":"martial","label_ru":"Воинское оружие"},{"id":"two_simple","label_ru":"Два простых оружия"}]},{"id":"pack","label_ru":"Набор","options":[{"id":"priest","label_ru":"Набор священника"},{"id":"explorer","label_ru":"Набор путешественника"}]}]},"raceTraits":{"dwarf":[{"id":"darkvision","name_ru":"Тёмное зрение","summary_ru":"В темноте ты видишь на 60 фт. как при тусклом свете, а в тусклом — как при ярком. Цвета в темноте не различаешь."},{"id":"dwarven_resilience","name_ru":"Устойчивость дварфов","summary_ru":"У тебя преимущество на спасброски против яда и сопротивление урону ядом."},{"id":"dwarven_combat_training","name_ru":"Дварфийская боевая тренировка","summary_ru":"Ты владеешь боевым топором, ручным топором, лёгким и боевым молотом."},{"id":"tool_proficiency","name_ru":"Владение инструментами","summary_ru":"Ты владеешь одним набором инструментов на выбор: кузнеца, каменщика или пивовара."},{"id":"stonecunning","name_ru":"Знание камня","summary_ru":"Если ты проверяешь Историю, связанную с каменной работой, бонус мастерства удваивается (компетентность)."}],"mountain_dwarf":[{"id":"dwarven_armor_training","name_ru":"Владение доспехами дварфов","summary_ru":"Ты владеешь лёгкими и средними доспехами."}],"hill_dwarf":[{"id":"dwarven_toughness","name_ru":"Дварфийская стойкость","summary_ru":"Максимум хитов увеличивается на 1, и ещё на 1 за каждый уровень."}],"elf":[{"id":"darkvision","name_ru":"Тёмное зрение","summary_ru":"В темноте ты видишь на 60 фт. как при тусклом свете, а в тусклом — как при ярком. Цвета в темноте не различаешь."},{"id":"keen_senses","name_ru":"Острые чувства","summary_ru":"Ты владеешь навыком Внимательность."},{"id":"fey_ancestry","name_ru":"Наследие фей","summary_ru":"У тебя преимущество на спасброски против очарования, и тебя нельзя магически усыпить."},{"id":"trance","name_ru":"Транс","summary_ru":"Тебе не нужен сон. Вместо длинного отдыха ты медитируешь 4 часа и получаешь те же блага, что другие — за 8 часов сна."}],"wood_elf":[{"id":"fleet_of_foot","name_ru":"Быстрые ноги","summary_ru":"Твоя скорость ходьбы — 35 фт."},{"id":"mask_of_the_wild","name_ru":"Маскировка в дикой местности","summary_ru":"Ты можешь прятаться, даже если тебя слегка заслоняют листва, сильный дождь, снег, туман или другие природные явления."}],"high_elf":[{"id":"elf_weapon_training","name_ru":"Эльфийская боевая тренировка","summary_ru":"Ты владеешь длинным мечом, коротким мечом, коротким и длинным луком."},{"id":"cantrip","name_ru":"Заговор","summary_ru":"Ты знаешь один заговор из списка волшебника. Базовая характеристика — Интеллект."},{"id":"extra_language","name_ru":"Дополнительный язык","summary_ru":"Ты знаешь один дополнительный язык на выбор."}],"human":[{"id":"extra_language","name_ru":"Дополнительный язык","summary_ru":"Ты знаешь один дополнительный язык на выбор."}]},"presetSubclass":{"cleric":"life_domain","druid":"circle_of_the_moon","wizard":"school_of_transmutation","paladin":"oath_of_devotion"}};

  if (typeof LIVE === "undefined") { var LIVE = window.SheetLive || (window.SheetLive = {}); }

  if (typeof classItems === "undefined") { var classItems = []; }
  function syncClassItemsFromSheet() {
    if (!classItems || !sheet) return;
    classItems.length = 0;
    (sheet.classes || []).forEach(function (c) { classItems.push(c); });
  }



  if (typeof applyMagicForDemoChar !== "function") {
    var applyMagicForDemoChar = function (id) {
      if (typeof applyMagicLoadout === "function") applyMagicLoadout(id);
    };
  }
  if (typeof auditMagicColumn !== "function") {
    var auditMagicColumn = function () { return null; };
  }
  if (typeof abilityModOf !== "function") {
    var abilityModOf = function (score) {
      const n = Number(score);
      return Math.floor(((Number.isFinite(n) ? n : 10) - 10) / 2);
    };
  }
  if (typeof syncClassTools !== "function") {
    var syncClassTools = function () {};
  }

(function bootAbilities() {
  if (typeof sheet === "undefined") return;
  if (typeof LIVE === "undefined") { var LIVE = window.SheetLive || (window.SheetLive = {}); }
  const CAT = typeof ABIL_CATALOG !== "undefined" ? ABIL_CATALOG : {};
  const KIND_RU = { action: "Действие", bonus: "Бонусное", reaction: "Реакция", resource: "Ресурс", passive: "Пассив" };
  const ABIL_RU = { str: "Сил", dex: "Лов", con: "Тел", int: "Инт", wis: "Муд", cha: "Хар" };
  const SKILL_RU = { athletics:"Атлетика", acrobatics:"Акробатика", sleight:"Ловкость рук", stealth:"Скрытность", arcana:"Магия", history:"История", investigation:"Анализ", nature:"Природа", religion:"Религия", animal:"Уход за животными", insight:"Проницательность", medicine:"Медицина", perception:"Внимательность", survival:"Выживание", deception:"Обман", intimidation:"Запугивание", performance:"Выступление", persuasion:"Убеждение" };
  const FILTERS = [
    { id: "all", label: "Все" },
    { id: "resource", label: "С ресурсом" },
    { id: "needs_choice", label: "Нужен выбор" },
    { id: "passive", label: "Пассивные" },
    { id: "custom", label: "Свои" }
  ];
  function typographyToTy(text) {
    let s = String(text || "");
    const pairs = [
      ["Получаете","Получаешь"],["получаете","получаешь"],["Выбираете","Выбираешь"],["выбираете","выбираешь"],
      ["Выберите","Выбери"],["выберите","выбери"],["Используете","Используешь"],["используете","используешь"],
      ["Можете","Можешь"],["можете","можешь"],["Должны","Должен"],["должны","должен"],
      ["Имеете","Имеешь"],["имеете","имеешь"],["Владеете","Владеешь"],["владеете","владеешь"],
      ["Знаете","Знаешь"],["знаете","знаешь"],["Делаете","Делаешь"],["делаете","делаешь"],
      ["Тратите","Тратишь"],["тратите","тратишь"],["по вам","по тебе"],["на вас","на тебя"],
      ["с вами","с тобой"],["у вас","у тебя"]
    ];
    pairs.forEach(function (p) { s = s.split(p[0]).join(p[1]); });
    s = s.replace(/\bВас\b/g,"Тебя").replace(/\bвас\b/g,"тебя");
    s = s.replace(/\bВам\b/g,"Тебе").replace(/\bвам\b/g,"тебе");
    s = s.replace(/\bВаши\b/g,"Твои").replace(/\bваши\b/g,"твои");
    s = s.replace(/\bВаш\b/g,"Твой").replace(/\bваш\b/g,"твой");
    s = s.replace(/\bВаша\b/g,"Твоя").replace(/\bваша\b/g,"твоя");
    s = s.replace(/\bВаше\b/g,"Твоё").replace(/\bваше\b/g,"твоё");
    s = s.replace(/\bВы\b/g,"Ты").replace(/\bвы\b/g,"ты");
    return s;
  }
  function previewSummary(text) {
    const t = typographyToTy(String(text || "").replace(/\s+/g, " ").trim());
    return t.length <= 90 ? t : t.slice(0, 87) + "…";
  }
  function mainClass() {
    if (sheet && sheet.classes && sheet.classes[0]) return sheet.classes[0];
    return (typeof classItems !== "undefined" && classItems[0]) ? classItems[0] : { id: "cleric", name: "Жрец", subclass: "Жизнь", level: (sheet && sheet.level) || 5 };
  }
  function classSlug() { return (mainClass().id || "cleric").toLowerCase(); }
  function subclassSlugFor(slug, name) {
    const preset = (CAT.presetSubclass || {})[slug];
    const list = ((CAT.classes || {})[slug] || {}).subclasses || {};
    const want = String(name || "").toLowerCase();
    if (want) {
      for (const id of Object.keys(list)) {
        const n = (list[id].name_ru || "").toLowerCase();
        if (want === n || want.indexOf(n) >= 0 || n.indexOf(want) >= 0) return id;
      }
    }
    return preset || null;
  }
  function conMod() { return abilityModOf(scoreTotal("con", true)); }
  function fmtSigned(n) { n = Number(n) || 0; return (n >= 0 ? "+" : "") + n; }
  function xpThreshold(level) { return (CAT.xp || [])[level] || 0; }
  function slotsTableFor(slug, level) {
    const table = slug === "paladin" ? CAT.palSlots : CAT.fullSlots;
    return (table && (table[String(level)] || table[level])) || [];
  }
  function applySlotTable(slug, level) {
    const arr = slotsTableFor(slug, level);
    const next = {};
    for (let i = 1; i <= 9; i++) {
      const max = arr[i - 1] || 0;
      const prev = (sheet.slots && sheet.slots[i]) || { cur: 0, max: 0 };
      const used = Math.max(0, (prev.max || 0) - (prev.cur || 0));
      next[i] = { cur: Math.max(0, max - used), max: max };
    }
    sheet.slots = next;
    if (typeof setSlots === "function") {
      for (let i = 1; i <= 9; i++) {
        try { setSlots(String(i), next[i].cur, next[i].max); } catch (e) {}
      }
    }
  }
  function averageHpGain(die, con, extras) {
    let bonus = Math.floor(die / 2) + 1 + con;
    if (extras && extras.dwarvenToughness) bonus += 1;
    if (extras && extras.draconicResilience) bonus += 1;
    return bonus;
  }
  function formatAverageHpLabel(die, con, gain, extras) {
    const conTxt = con >= 0 ? "+" + con : String(con);
    const parts = ["Среднее по к" + die + ": ⌊" + die + "/2⌋+1 + ТЕЛ (" + conTxt + ")"];
    if (extras && extras.draconicResilience) parts.push("+1 Драконья устойчивость");
    if (extras && extras.dwarvenToughness) parts.push("+1 Дварфийская стойкость");
    return parts.join(" ") + " = +" + gain + " к макс. хитам";
  }
  function hasDwarvenToughness() { return /холмов/i.test(sheet.race || ""); }
  function mcEligible(slug) {
    const meta = (CAT.classMeta || {})[slug];
    if (!meta) return { ok: false, reason: "Нет такого класса в справочнике." };
    const current = classSlug();
    if (slug === current) return { ok: false, reason: "Этот класс уже есть — бери «Этот класс»." };
    function okNeed(key) {
      if (key === "str_or_dex") return scoreTotal("str", true) >= 13 || scoreTotal("dex", true) >= 13;
      return scoreTotal(key, true) >= 13;
    }
    const failed = [];
    (((CAT.classMeta || {})[current] || {}).mc || []).concat(meta.mc || []).forEach(function (k) {
      if (!okNeed(k)) failed.push(k === "str_or_dex" ? "Сил или Лов 13+" : ((ABIL_RU[k] || k) + " 13+"));
    });
    if (failed.length) return { ok: false, reason: "Для мультикласса не хватает: " + failed.join(", ") + "." };
    return { ok: true, reason: "" };
  }
  function ensureAbilState() {
    if (!sheet.abil) {
      sheet.abil = { filter: "all", query: "", openKeys: {}, custom: [], pendingSteps: [], pendingAsi: null, featurePicks: {}, stone: "darkvision", recoveryUsed: false, draft: {}, leveledFrom: null };
    }
    if (!sheet.abil.featurePicks) sheet.abil.featurePicks = {};
    if (!sheet.abil.custom) sheet.abil.custom = [];
    if (!sheet.abil.openKeys) sheet.abil.openKeys = {};
    return sheet.abil;
  }
  function defaultPicksFor(slug) {
    const picks = {};
    if (slug === "paladin") picks.fighting_style_paladin = "defense";
    if (slug === "wizard") picks.transmuter_stone = (sheet.abil && sheet.abil.stone) || "darkvision";
    return picks;
  }
  function pickOf(id) {
    const a = ensureAbilState();
    if (a.featurePicks[id] == null && defaultPicksFor(classSlug())[id]) a.featurePicks[id] = defaultPicksFor(classSlug())[id];
    return a.featurePicks[id];
  }
  function unlockedFeatures() {
    const cls = mainClass();
    const slug = classSlug();
    const pack = (CAT.classes || {})[slug];
    if (!pack) return [];
    const level = cls.level || sheet.level || 1;
    const out = [];
    function take(f, source, sourceLabel) {
      if (f.optional && !(window.SheetProto && window.SheetProto.tceFeaturesOn && window.SheetProto.tceFeaturesOn())) return;
      if ((f.level || 1) > level) return;
      if (String(f.id || "").indexOf("asi_") === 0) return;
      out.push(Object.assign({}, f, { source: source, sourceLabel: sourceLabel, classLevel: level, className: cls.name, classEntryId: slug, classSlug: slug }));
    }
    (pack.features || []).forEach(function (f) { take(f, "class", cls.name); });
    const subId = subclassSlugFor(slug, cls.subclass);
    const sub = subId && pack.subclasses ? pack.subclasses[subId] : null;
    if (sub) (sub.features || []).forEach(function (f) { take(f, "subclass", sub.name_ru); });
    return out;
  }

  function resourceUses(feature) {
    const res = feature.resource;
    if (!res) return null;
    const level = feature.classLevel || sheet.level || 1;
    let max = res.uses;
    if (res.uses_from === "proficiency_bonus") max = typeof PB === "number" ? PB : 3;
    if (res.scale_uses) {
      let best = max || 0;
      Object.keys(res.scale_uses).forEach(function (lv) { if (Number(lv) <= level) best = res.scale_uses[lv]; });
      max = best;
    }
    if (res.pool_id === "channel_divinity") max = sheet.channelMax || max || 1;
    if (feature.id === "lay_on_hands") max = 5 * (mainClass().level || sheet.level || 1);
    if (feature.id === "divine_sense") max = 1 + abilityModOf(scoreTotal("cha", true));
    return { max: max || 0, pool: res.pool_id, recharge: res.recharge, name: res.pool_name_ru || feature.name_ru };
  }
  function featureNeedsChoice(f) {
    if (f.id === "fighting_style_paladin") return !pickOf("fighting_style_paladin");
    if (f.id === "transmuters_stone" || f.id === "transmuter_stone") return !(pickOf("transmuter_stone") || (ensureAbilState().stone));
    if (f.choice && !pickOf(f.id)) return true;
    return false;
  }
  function hasResource(f) { return Boolean(f.resource && (f.resource.pool_id || f.resource.uses || f.resource.uses_from)); }
  function raceTraitCards() {
    const race = sheet.race || "";
    const keys = [];
    if (/дварф/i.test(race)) keys.push("dwarf");
    if (/горн/i.test(race)) keys.push("mountain_dwarf");
    if (/холмов/i.test(race)) keys.push("hill_dwarf");
    if (/эльф/i.test(race)) keys.push("elf");
    if (/лесн/i.test(race)) keys.push("wood_elf");
    if (/высш/i.test(race)) keys.push("high_elf");
    if (/^человек/i.test(race) || race === "Человек") keys.push("human");
    const seen = {}, out = [];
    keys.forEach(function (k) {
      ((CAT.raceTraits || {})[k] || []).forEach(function (t) {
        if (t.id === "darkvision" || seen[t.id]) return;
        seen[t.id] = true; out.push(t);
      });
    });
    return out;
  }
  function backgroundFeature() {
    const row = (CAT.backgrounds || []).find(function (b) { return b.name_ru === (sheet.background || ""); });
    if (!row || !row.feature_name_ru) return null;
    return { id: row.slug, nameRu: row.feature_name_ru, summaryRu: row.feature_text_ru, bgName: row.name_ru };
  }
  function listFeaturesFiltered() {
    const a = ensureAbilState();
    const q = (a.query || "").trim().toLowerCase();
    const filter = a.filter || "all";
    return unlockedFeatures().filter(function (f) {
      if (q) {
        const hay = ((f.name_ru || "") + " " + (f.summary_ru || "") + " " + (f.name_en || "")).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      if (filter === "all") return true;
      if (filter === "custom") return false;
      if (filter === "resource") return hasResource(f);
      if (filter === "passive") return (f.kind || "passive") === "passive";
      if (filter === "needs_choice") return featureNeedsChoice(f);
      return true;
    });
  }
  function filterCounts() {
    const features = unlockedFeatures();
    const a = ensureAbilState();
    const dv = (sheet.darkvisionEff || sheet.darkvisionBase || 0) > 0;
    return {
      all: features.length + (a.custom || []).length,
      resource: features.filter(hasResource).length,
      needsChoice: features.filter(featureNeedsChoice).length,
      passive: features.filter(function (f) { return (f.kind || "passive") === "passive"; }).length + ((dv || raceTraitCards().length) ? 1 : 0) + (backgroundFeature() ? 1 : 0),
      custom: (a.custom || []).length
    };
  }
  function useActionFor(f) {
    const id = f.id || "";
    if (id === "channel_divinity" || id === "channel_divinity_paladin" || id === "turn_undead") return { open: "res-channel", label: "Использовать" };
    if (id === "cd_preserve_life") return { open: "preserve-life", label: "Использовать" };
    if (id === "wild_shape" || id === "combat_wild_shape") return { open: "wild-shape", label: "Дикий облик" };
    if (id === "arcane_recovery") return { open: "res-arcane", label: "Восстановить ячейки" };
    if (id === "lay_on_hands") return { open: "res-hands", label: "Использовать" };
    if (id === "divine_sense") return { open: "divine-sense", label: "Использовать" };
    if (id === "divine_smite") return { open: "divine-smite", label: "Кара" };
    if (id === "rage") return { instant: "rage-apply", label: "Использовать" };
    if (id === "sorcery_points" || id === "font_of_magic" || id === "metamagic") return { open: "res-sorcery", label: "Очки чародейства" };
    if (id === "ki" || id === "ki_points") return { open: "res-ki", label: "Ци" };
    if (id === "bardic_inspiration") return { open: "res-bardic", label: "Вдохновение" };
    if (id === "superiority_dice" || id === "combat_superiority") return { open: "res-superiority", label: "Превосходство" };
    if (id === "psionic_energy" || id === "psionic_energy_dice") return { open: "res-psionic", label: "Пси-кости" };
    if (id === "soul_trinkets") return { open: "res-trinkets", label: "Частицы души" };
    if (id.indexOf("mystic_arcanum") === 0) return { open: "res-arcanum", label: "Арканум" };
    if (id === "cd_sacred_weapon" || id === "cd_turn_the_unholy") return { open: "res-channel", label: "Использовать" };
    if (id === "shapechanger" || id.indexOf("shapechanger") >= 0) return { open: "feature-self-form", label: "Перевёртыш" };
    if (id === "transmuters_stone" || id === "transmuter_stone" || /кам/i.test(f.name_ru || "") && /преобраз|трансмут/i.test(f.name_ru || "")) return { open: "transmuter-stone", label: "Камень" };
    if (id === "minor_alchemy") return { open: "wizard-feature", label: "Применить" };
    return null;
  }
  function hitStyle() { return 'style="border:0;background:none;padding:0;margin:0;font:inherit;color:inherit;text-align:left;cursor:pointer;min-width:0;flex:1 1 auto"'; }
  function renderFeatureCard(f) {
    const a = ensureAbilState();
    const key = "feat:" + (f.id || f.name_ru);
    const open = !!a.openKeys[key];
    const kind = KIND_RU[f.kind] || "Пассив";
    const uses = resourceUses(f);
    const need = featureNeedsChoice(f);
    const use = useActionFor(f);
    let meta = kind;
    if (uses && uses.max) {
      let cur = uses.max;
      if (uses.pool === "channel_divinity") cur = sheet.channelCur != null ? sheet.channelCur : uses.max;
      if (f.id === "lay_on_hands") cur = sheet.handsCur != null ? sheet.handsCur : uses.max;
      if (f.id === "divine_sense") cur = sheet.senseCur != null ? sheet.senseCur : uses.max;
      if (f.id === "arcane_recovery") cur = a.recoveryUsed ? 0 : 1;
      const rest = uses.recharge === "short_rest" ? " · короткий отдых" : uses.recharge === "long_rest" ? " · прод. отдых" : "";
      meta = cur + "/" + (f.id === "arcane_recovery" ? 1 : uses.max) + rest;
    }
    if (need) meta = "Нужен выбор" + (meta ? " · " + meta : "");
    const head = '<div class="scene-card__hit"><span aria-hidden="true"></span><button type="button" data-abil-toggle="' + esc(key) + '" ' + hitStyle() + '><span class="scene-card__name">' + esc(f.name_ru) + ' <span class="src-tag">' + esc(f.sourceLabel || f.className || f.name_ru) + '</span></span><span class="scene-card__meta">' + esc(meta) + "</span></button></div>";
    if (!open) return '<article class="scene-card is-feat" data-feat data-source="' + esc(f.source || "class") + '" data-feat-id="' + esc(f.id || "") + '">' + head + "</article>";
    let actions = "";
    if (use) {
      if (use.instant) actions += '<button type="button" class="btn primary" data-res-instant="' + esc(use.instant) + '">' + esc(use.label) + "</button>";
      else actions += '<button type="button" class="btn primary" data-open="' + esc(use.open) + '">' + esc(use.label) + "</button>";
    }
    if (f.id === "fighting_style_paladin") actions += renderStylePicker();
    if (f.id === "transmuters_stone" || f.id === "transmuter_stone") actions += '<button type="button" class="btn" data-open="transmuter-stone">Выбрать свойство камня</button>';
    const paras = typographyToTy(f.summary_ru || "").split(/\n+/).filter(Boolean).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    return '<article class="scene-card is-feat is-open" data-feat data-source="' + esc(f.source || "class") + '" data-feat-id="' + esc(f.id || "") + '">' + head + '<div class="scene-card__body">' + paras + (actions ? '<div class="scene-card__actions">' + actions + "</div>" : "") + "</div></article>";
  }
  function renderStylePicker() {
    const cur = pickOf("fighting_style_paladin") || "defense";
    const chips = (CAT.fightingStyles || []).map(function (s) {
      return '<button type="button" class="sheet-chip' + (cur === s.id ? " is-on" : "") + '" data-abil-act="pick-style" data-v="' + esc(s.id) + '">' + esc(s.name_ru) + "</button>";
    }).join("");
    const def = (CAT.fightingStyles || []).find(function (s) { return s.id === cur; });
    return '<div class="pad-row" style="flex-wrap:wrap;margin-top:8px">' + chips + "</div>" + (def ? "<p>" + esc(typographyToTy(def.summary_ru)) + "</p>" : "");
  }
  function renderStaticCard(key, name, sourceTag, meta, body, actions, chip) {
    const a = ensureAbilState();
    const open = !!a.openKeys[key];
    const head = '<div class="scene-card__hit"><span aria-hidden="true"></span><button type="button" data-abil-toggle="' + esc(key) + '" ' + hitStyle() + '><span class="scene-card__name">' + esc(name) + ' <span class="src-tag">' + esc(chip || name) + '</span></span><span class="scene-card__meta">' + esc(meta || "") + "</span></button></div>";
    if (!open) return '<article class="scene-card is-feat" data-feat data-source="' + esc(sourceTag) + '">' + head + "</article>";
    return '<article class="scene-card is-feat is-open" data-feat data-source="' + esc(sourceTag) + '">' + head + '<div class="scene-card__body"><p>' + typographyToTy(esc(body || "")) + "</p>" + (actions || "") + "</div></article>";
  }

  function renderFeaturesScene() {
    const a = ensureAbilState();
    const list = document.querySelector("[data-feat-list]");
    const filtersBox = document.querySelector("[data-scene-panel='features'] .filters");
    const toolbar = document.querySelector("[data-feat-toolbar]");
    const search = document.querySelector("[data-feat-search]");
    if (search) search.setAttribute("placeholder", "Избранный, стиль боя…");
    const counts = filterCounts();
    const visibleFilters = FILTERS.filter(function (row) {
      if (row.id === "all") return true;
      if (row.id === "resource") return counts.resource > 0;
      if (row.id === "needs_choice") return counts.needsChoice > 0;
      if (row.id === "passive") return counts.passive > 0;
      if (row.id === "custom") return counts.custom > 0;
      return true;
    });
    if (!visibleFilters.some(function (r) { return r.id === a.filter; })) a.filter = "all";
    if (filtersBox) {
      filtersBox.setAttribute("aria-label", "Фильтр способностей");
      filtersBox.innerHTML = visibleFilters.map(function (row) {
        const on = a.filter === row.id;
        return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-feat-filter="' + row.id + '" role="tab" aria-selected="' + (on ? "true" : "false") + '">' + row.label + "</button>";
      }).join("");
    }
    if (toolbar) {
      const c = (typeof ensureCompanionsState === "function") ? ensureCompanionsState() : (sheet.comp || {});
      const bits = [];
      if (c.wildUnlocked || (c.circleFeatures || []).indexOf("wild_shape") >= 0) bits.push('<button type="button" class="chip" data-open="wild-shape" data-class-tool="wild-shape">Дикий облик</button>');
      if (classSlug() === "warlock") bits.push('<button type="button" class="chip" data-open="invocations">Мистические воззвания</button>');
      if (classSlug() === "ranger") bits.push('<button type="button" class="chip" data-open="ranger-favored">Избранное следопыта</button>');
      if (a.pendingAsi) bits.push('<button type="button" class="chip" data-open="asi">Увеличение характеристик</button>');
      toolbar.innerHTML = bits.join("");
      toolbar.hidden = bits.length === 0;
    }
    if (!list) return;
    const filter = a.filter;
    const q = (a.query || "").trim().toLowerCase();
    const cls = mainClass();
    const features = listFeaturesFiltered();
    const parts = [];
    const barKeys = [];
    features.forEach(function (f) { barKeys.push("feat:" + (f.id || f.name_ru)); });
    if (filter === "all" || filter === "passive") {
      const traits = raceTraitCards();
      const dv = sheet.darkvisionEff || sheet.darkvisionBase || 0;
      const raceCards = [];
      if (dv > 0 && (!q || ("тёмное зрение " + dv).indexOf(q) >= 0 || "темное зрение".indexOf(q) >= 0)) {
        raceCards.push(renderStaticCard("race:darkvision", "Тёмное зрение " + dv + " фт.", "race", "в темноте на " + dv + " фт.", "В темноте ты видишь на " + dv + " фт. как при тусклом свете, а в тусклом — как при ярком. Цвета в темноте не различаешь.", "", sheet.race || "Раса"));
        barKeys.push("race:darkvision");
      }
      traits.forEach(function (t) {
        if (q && (t.name_ru + " " + t.summary_ru).toLowerCase().indexOf(q) < 0) return;
        raceCards.push(renderStaticCard("race:" + t.id, t.name_ru, "race", previewSummary(t.summary_ru), t.summary_ru, "", sheet.race || "Раса"));
        barKeys.push("race:" + t.id);
      });
      if (raceCards.length) parts.push('<div class="feat-group"><div class="feat-group__title">' + esc(sheet.race || "Раса") + ' <span class="feat-group__count">· ' + raceCards.length + "</span></div>" + raceCards.join("") + "</div>");
      const bg = backgroundFeature();
      if (bg && (!q || (bg.nameRu + " " + bg.summaryRu).toLowerCase().indexOf(q) >= 0)) {
        parts.push('<div class="feat-group"><div class="feat-group__title">' + esc(bg.bgName) + ' <span class="feat-group__count">· 1</span></div>' + renderStaticCard("bg:" + bg.id, bg.nameRu, "background", previewSummary(bg.summaryRu), bg.summaryRu, "", bg.bgName) + "</div>");
        barKeys.push("bg:" + bg.id);
      }
    }
    const bySource = { class: [], subclass: [] };
    features.forEach(function (f) { (bySource[f.source] || (bySource[f.source] = [])).push(f); });
    if (bySource.class && bySource.class.length) {
      parts.push('<div class="feat-group"><div class="feat-group__title">' + esc(cls.name) + " " + cls.level + ' <span class="feat-group__count">· ' + bySource.class.length + "</span></div>" + bySource.class.map(renderFeatureCard).join("") + "</div>");
    }
    if (bySource.subclass && bySource.subclass.length) {
      parts.push('<div class="feat-group"><div class="feat-group__title">' + esc(cls.subclass || "Архетип") + ' <span class="feat-group__count">· ' + bySource.subclass.length + "</span></div>" + bySource.subclass.map(renderFeatureCard).join("") + "</div>");
    }
    if (filter === "all" || filter === "custom") {
      const customs = (a.custom || []).filter(function (row) { return !q || (row.nameRu + " " + row.summaryRu).toLowerCase().indexOf(q) >= 0; });
      if (customs.length) {
        const cards = customs.map(function (row) {
          const actions = '<div class="scene-card__actions"><button type="button" class="btn" data-abil-act="edit-custom" data-id="' + esc(row.id) + '">Править</button><button type="button" class="btn" data-abil-act="del-custom" data-id="' + esc(row.id) + '">Удалить</button></div>';
          barKeys.push("custom:" + row.id);
          return renderStaticCard("custom:" + row.id, row.nameRu, "custom", previewSummary(row.summaryRu), row.summaryRu, actions, "Своя");
        });
        parts.push('<div class="feat-group"><div class="feat-group__title">Свои <span class="feat-group__count">· ' + customs.length + "</span></div>" + cards.join("") + "</div>");
      }
    }
    const collapse = barKeys.length ? '<div class="abil-column__toolbar features-panel__collapse-bar" style="display:flex;gap:8px;margin:0 0 8px"><button type="button" class="ghost" data-abil-act="collapse-feats">▲ Свернуть все</button><button type="button" class="ghost" data-abil-act="expand-feats">▼ Развернуть все</button></div>' : "";
    a._toggleKeys = barKeys;
    list.innerHTML = parts.length ? collapse + parts.join("") : collapse + '<p class="pad-note">Пока нет открытых умений. Выбери класс и уровень — или добавь свою способность.</p>';
  }
  function resetLevelUpDraft() {
    ensureAbilState().levelUp = { mode: "same", hpMode: "average", manualHp: "", newClass: "" };
  }
  function renderLevelUp() {
    const a = ensureAbilState();
    if (!a.levelUp) resetLevelUpDraft();
    const d = a.levelUp;
    const cls = mainClass();
    const slug = classSlug();
    const die = ((CAT.classMeta || {})[slug] || { hit_die: 8 }).hit_die || 8;
    const con = conMod();
    const extras = { dwarvenToughness: hasDwarvenToughness() };
    const avg = averageHpGain(die, con, extras);
    const ready = sheet.xp >= sheet.xpNext && sheet.level < 20;
    const xpNote = ready
      ? "Опыта хватает на уровень " + sheet.nextLevel + "."
      : "До ур. " + sheet.nextLevel + " ещё " + Math.max(0, (sheet.xpNext || 0) - (sheet.xp || 0)) + " XP.";
    const hpGain = d.hpMode === "average" ? avg : (d.manualHp === "" ? null : Math.floor(Number(d.manualHp)));
    let can = hpGain != null && isFinite(hpGain);
    let block = "";
    if (d.mode === "same") {
      if (!can && d.hpMode === "manual") block = "Укажи прибавку к хитам.";
    } else if (!d.newClass) { can = false; block = "Выбери класс из справочника."; }
    else {
      const gate = mcEligible(d.newClass);
      if (!gate.ok) { can = false; block = typographyToTy(gate.reason); }
      else if (!can && d.hpMode === "manual") block = "Укажи прибавку к хитам.";
    }
    const classChips = (typeof classItems !== "undefined" ? classItems : [cls]).map(function (c) {
      return '<button type="button" class="sheet-chip is-on">' + esc(c.name) + " " + c.level + "</button>";
    }).join("");
    const mcChips = Object.keys(CAT.classMeta || {}).map(function (id) {
      if (id === slug) return "";
      const m = CAT.classMeta[id];
      const gate = mcEligible(id);
      return '<button type="button" class="sheet-chip' + (d.newClass === id ? " is-on" : "") + (gate.ok ? "" : " is-blocked") + '" data-abil-act="lu-class" data-v="' + id + '"' + (gate.ok ? "" : ' title="' + esc(gate.reason) + '"') + ">" + esc(m.name_ru) + "</button>";
    }).join("");
    const targetDie = d.mode === "multiclass" && d.newClass ? (((CAT.classMeta || {})[d.newClass] || {}).hit_die || 8) : die;
    const hpLabel = formatAverageHpLabel(targetDie, con, averageHpGain(targetDie, con, extras), extras);
    const nextName = d.mode === "same" ? (cls.name + " " + ((cls.level || sheet.level) + 1)) : (((CAT.classMeta[d.newClass] || {}).name_ru || "новый класс") + " 1");
    return '<div class="form"><p>' + esc(typographyToTy("Куда идёт новый уровень персонажа? Можно прокачать уже взятый класс или взять 1 уровень другого (мультикласс). Характеристики должны удовлетворять требованиям справочника.")) + "</p>" +
      '<p class="pad-note">' + esc(xpNote) + " Сейчас " + fmtNum(sheet.xp) + " / " + fmtNum(sheet.xpNext) + " XP · " + esc(cls.name) + " " + cls.level + " → " + esc(nextName) + ".</p>" +
      '<div class="pad-row" role="group" aria-label="Куда идёт уровень"><button type="button" class="sheet-chip' + (d.mode === "same" ? " is-on" : "") + '" data-abil-act="lu-mode" data-v="same">Этот класс</button><button type="button" class="sheet-chip' + (d.mode === "multiclass" ? " is-on" : "") + '" data-abil-act="lu-mode" data-v="multiclass">Мультикласс</button></div>' +
      (d.mode === "same" ? '<div class="pad-row" style="margin-top:8px">' + classChips + "</div>" : '<div class="pad-row" style="flex-wrap:wrap;margin-top:8px">' + mcChips + "</div>") +
      '<p class="section-label">Хиты</p><div class="pad-row"><button type="button" class="sheet-chip' + (d.hpMode === "average" ? " is-on" : "") + '" data-abil-act="lu-hp" data-v="average">Среднее</button><button type="button" class="sheet-chip' + (d.hpMode === "manual" ? " is-on" : "") + '" data-abil-act="lu-hp" data-v="manual">Вручную</button></div>' +
      (d.hpMode === "average" ? '<p class="pad-note">' + esc(hpLabel) + "</p>" : '<label>Прибавка к макс. хитам<input data-lu-manual type="number" min="1" value="' + esc(d.manualHp) + '" placeholder="бросок кости + модификатор ТЕЛ"></label>') +
      (block ? '<p class="pad-note">' + esc(block) + "</p>" : "") +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="lu-confirm"' + (can ? "" : " disabled") + ">Повысить</button></div></div>";
  }
  function grantsForLevel(slug, newLevel) {
    const pack = (CAT.classes || {})[slug];
    const out = [];
    if (!pack) return out;
    function add(f, src) {
      if (f.optional || f.level !== newLevel) return;
      if (String(f.id || "").indexOf("asi_") === 0) { out.push({ type: "asi", feature: f, source: src }); return; }
      out.push({ type: "feature", feature: f, source: src });
    }
    (pack.features || []).forEach(function (f) { add(f, "class"); });
    const subId = subclassSlugFor(slug, mainClass().subclass);
    const sub = subId && pack.subclasses ? pack.subclasses[subId] : null;
    if (sub) (sub.features || []).forEach(function (f) { add(f, "subclass"); });
    if (slug === "wizard") out.push({ type: "spellbook" });
    return out;
  }
  function applySameClassLevelUp(hpGain) {
    const cls = mainClass();
    const slug = classSlug();
    const from = cls.level || sheet.level;
    const to = from + 1;
    const grants = grantsForLevel(slug, to);
    sheet.hpMax = (sheet.hpMax || 0) + hpGain;
    sheet.hp = (sheet.hp || 0) + hpGain;
    sheet.level = (sheet.level || from) + 1;
    cls.level = to;
    if (classItems && classItems[0]) classItems[0].level = to;
    sheet.nextLevel = Math.min(20, sheet.level + 1);
    sheet.xpNext = xpThreshold(sheet.nextLevel) || sheet.xpNext;
    if (typeof pbFromLevel === "function") PB = pbFromLevel(sheet.level);
    if (sheet.hitDice && sheet.hitDice[slug]) {
      sheet.hitDice[slug].max = (sheet.hitDice[slug].max || from) + 1;
      sheet.hitDice[slug].cur = (sheet.hitDice[slug].cur || 0) + 1;
    } else if (typeof ensureHitDice === "function") ensureHitDice();
    applySlotTable(slug, to);
    if (slug === "cleric" && to >= 6) {
      sheet.channelMax = 2;
      sheet.channelCur = Math.min(sheet.channelMax, (sheet.channelCur != null ? sheet.channelCur : 1) + 1);
    }
    if (slug === "paladin") {
      sheet.handsMax = 5 * to;
      sheet.handsCur = (sheet.handsCur != null ? sheet.handsCur : 5 * from) + 5;
    }
    const a = ensureAbilState();
    a.leveledFrom = { slug: slug, from: from, to: to, hpGain: hpGain };
    a.pendingSteps = [];
    a.pendingAsi = null;
    grants.forEach(function (g) {
      if (g.type === "asi") a.pendingSteps.push({ type: "asi", level: to });
      if (g.type === "spellbook") a.pendingSteps.push({ type: "spellbook", level: to });
    });
    if (a.pendingSteps.some(function (s) { return s.type === "asi"; })) a.pendingAsi = { classId: slug, level: to, mode: "plus2", scores: {}, feat: null };
    if (typeof applyXpFace === "function") applyXpFace({ xp: sheet.xp, xpNext: sheet.xpNext, level: sheet.level, nextLevel: sheet.nextLevel });
    else if (typeof renderXpLabel === "function") renderXpLabel();
    if (typeof layoutClassRow === "function") layoutClassRow();
    if (typeof syncAbilityRail === "function") syncAbilityRail();
    if (typeof syncHeader === "function") syncHeader();
    const names = grants.filter(function (g) { return g.type === "feature"; }).map(function (g) { return g.feature.name_ru; });
    const bits = ["+" + hpGain + " хитов (" + sheet.hp + "/" + sheet.hpMax + ")"];
    if (names.length) bits.push(names.join(", "));
    toast(cls.name + " " + to + ": " + bits.join(" · "));
    closeDialog();
    renderFeaturesScene();
    if (a.pendingSteps.length) { a.guidedIndex = 0; openDialog("guided"); }
  }

  function renderGuided() {
    const a = ensureAbilState();
    const steps = a.pendingSteps || [];
    if (!steps.length) return '<p>Сейчас нет незакрытых шагов повышения.</p><div class="modal-actions"><button type="button" class="btn primary" data-close>Закрыть</button></div>';
    const i = a.guidedIndex || 0;
    const step = steps[i];
    const nav = '<p class="pad-note">Шаг ' + (i + 1) + " из " + steps.length + ".</p>";
    if (step.type === "asi") return nav + renderAsi(true);
    if (step.type === "spellbook") return nav + renderSpellbookPicks();
    return nav + "<p>Неизвестный шаг.</p>";
  }
  function renderSpellbookPicks() {
    const a = ensureAbilState();
    if (!a.bookPicks) a.bookPicks = [];
    const lvl = mainClass().level || 11;
    const maxCircle = lvl >= 11 ? 6 : lvl >= 9 ? 5 : lvl >= 7 ? 4 : lvl >= 5 ? 3 : lvl >= 3 ? 2 : 1;
    const q = (a.bookQuery || "").trim().toLowerCase();
    const list = (CAT.wizardSpells || []).filter(function (s) {
      return s.level <= maxCircle && (!q || (s.name_ru + " " + s.slug).toLowerCase().indexOf(q) >= 0);
    });
    const rows = list.slice(0, 48).map(function (s) {
      const on = a.bookPicks.indexOf(s.slug) >= 0;
      return '<button type="button" class="sheet-chip' + (on ? " is-on" : "") + '" data-abil-act="book-pick" data-v="' + esc(s.slug) + '">' + esc(s.name_ru) + " · " + s.level + "</button>";
    }).join("");
    const picked = a.bookPicks.map(function (slug) { const s = (CAT.wizardSpells || []).find(function (x) { return x.slug === slug; }); return s ? s.name_ru : slug; });
    return '<div class="form"><p>Запиши в книгу два новых заклинания волшебника не выше ' + maxCircle + " круга.</p>" +
      '<label>Поиск<input data-book-query placeholder="Название заклинания" value="' + esc(a.bookQuery || "") + '"></label>' +
      '<div class="pad-row" style="flex-wrap:wrap;max-height:42vh;overflow:auto">' + rows + "</div>" +
      '<p class="pad-note">Выбрано ' + a.bookPicks.length + "/2" + (picked.length ? ": " + picked.join(", ") : "") + ".</p>" +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Позже</button><button type="button" class="btn primary" data-abil-act="book-confirm"' + (a.bookPicks.length === 2 ? "" : " disabled") + ">Записать в книгу</button></div></div>";
  }
  function renderAsi() {
    const a = ensureAbilState();
    if (!a.pendingAsi) a.pendingAsi = { classId: classSlug(), level: mainClass().level, mode: "plus2", scores: {}, feat: null };
    const d = a.pendingAsi;
    const keys = ["str","dex","con","int","wis","cha"];
    const modeRow = '<div class="pad-row"><button type="button" class="sheet-chip' + (d.mode === "plus2" ? " is-on" : "") + '" data-abil-act="asi-mode" data-v="plus2">+2 к одной</button><button type="button" class="sheet-chip' + (d.mode === "plus1" ? " is-on" : "") + '" data-abil-act="asi-mode" data-v="plus1">+1 и +1</button><button type="button" class="sheet-chip' + (d.mode === "feat" ? " is-on" : "") + '" data-abil-act="asi-mode" data-v="feat">Черта</button></div>';
    if (d.mode === "feat") {
      return '<div class="form"><p>Вместо увеличения характеристик можешь взять черту.</p>' + modeRow +
        (d.feat ? "<p>Черта: <strong>" + esc(d.feat.name_ru) + "</strong></p>" : '<p class="pad-note">Черта ещё не выбрана.</p>') +
        '<div class="pad-row"><button type="button" class="btn" data-open="feat-setup">Выбрать черту</button></div>' +
        '<div class="modal-actions"><button type="button" class="btn" data-close>Позже</button><button type="button" class="btn primary" data-abil-act="asi-confirm"' + (d.feat ? "" : " disabled") + ">Применить</button></div></div>";
    }
    const spent = Object.keys(d.scores).reduce(function (s, k) { return s + (d.scores[k] || 0); }, 0);
    const chips = keys.map(function (k) {
      const add = d.scores[k] || 0;
      const base = scoreTotal(k, true);
      const locked = !add && ((d.mode === "plus2" && spent >= 2) || (d.mode === "plus1" && spent >= 2) || (d.mode === "plus2" && Object.keys(d.scores).some(function (x) { return d.scores[x] && x !== k; })) || (base >= 20));
      return '<button type="button" class="sheet-chip' + (add ? " is-on" : "") + '" data-abil-act="asi-score" data-v="' + k + '"' + (locked ? " disabled" : "") + ">" + esc(ABIL_RU[k] + " " + base + (add ? " → " + (base + add) : "") + (add ? " +" + add : "")) + "</button>";
    }).join("");
    const can = d.mode === "plus2" ? spent === 2 && Object.keys(d.scores).filter(function (k) { return d.scores[k]; }).length === 1 : spent === 2 && Object.keys(d.scores).filter(function (k) { return d.scores[k]; }).length === 2;
    return '<div class="form"><p>Увеличение характеристик: распредели +2 к одной или +1 к двум (не выше 20).</p>' + modeRow +
      '<div class="pad-row" style="flex-wrap:wrap;margin-top:8px">' + chips + "</div><p class=\"pad-note\">Распределено " + spent + "/2.</p>" +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Позже</button><button type="button" class="btn primary" data-abil-act="asi-confirm"' + (can ? "" : " disabled") + ">Применить</button></div></div>";
  }
  function featPrereqOk(feat) {
    const req = feat.prerequisites_ru;
    if (!req) return { ok: true, reason: "" };
    const m = String(req).match(/^(Сил|Лов|Тел|Инт|Муд|Хар)(?: или (Сил|Лов|Тел|Инт|Муд|Хар))? (\d+)\+/);
    const map = { "Сил":"str","Лов":"dex","Тел":"con","Инт":"int","Муд":"wis","Хар":"cha" };
    if (m) {
      const need = Number(m[3]);
      if (scoreTotal(map[m[1]], true) >= need || (m[2] && scoreTotal(map[m[2]], true) >= need)) return { ok: true, reason: "" };
      return { ok: false, reason: "Требования: " + req };
    }
    const slug = classSlug();
    if (/Умение накладывать хотя бы одно заклинание/i.test(req)) {
      if (["cleric","druid","wizard","sorcerer","warlock","bard"].indexOf(slug) >= 0) return { ok: true, reason: "" };
      if ((slug === "paladin" || slug === "ranger") && (mainClass().level || 0) >= 2) return { ok: true, reason: "" };
      return { ok: false, reason: "Требования: " + req };
    }
    if (/лёгкими доспехами/i.test(req)) {
      if (slug === "wizard") return { ok: false, reason: "Требования: " + req };
      return { ok: true, reason: "" };
    }
    if (/средними доспехами/i.test(req)) {
      if (slug === "cleric" || slug === "paladin" || slug === "druid" || /дварф/i.test(sheet.race || "")) return { ok: true, reason: "" };
      return { ok: false, reason: "Требования: " + req };
    }
    if (/тяжёлыми доспехами/i.test(req)) {
      if (slug === "paladin" || (slug === "cleric" && /жизн/i.test(mainClass().subclass || ""))) return { ok: true, reason: "" };
      return { ok: false, reason: "Требования: " + req };
    }
    return { ok: true, reason: "" };
  }
  function renderFeatSetup() {
    const a = ensureAbilState();
    if (!a.featDraft) a.featDraft = { query: "", slug: a.pendingAsi && a.pendingAsi.feat ? a.pendingAsi.feat.slug : "" };
    const q = (a.featDraft.query || "").trim().toLowerCase();
    const list = (CAT.feats || []).filter(function (f) { return !q || (f.name_ru + " " + (f.summary_ru || "")).toLowerCase().indexOf(q) >= 0; });
    const rows = list.map(function (f) {
      const gate = featPrereqOk(f);
      return '<button type="button" class="sheet-chip' + (a.featDraft.slug === f.slug ? " is-on" : "") + (gate.ok ? "" : " is-blocked") + '" data-abil-act="feat-pick" data-v="' + esc(f.slug) + '"' + (gate.ok ? "" : ' title="' + esc(gate.reason) + '"') + ">" + esc(f.name_ru) + "</button>";
    }).join("");
    const cur = (CAT.feats || []).find(function (f) { return f.slug === a.featDraft.slug; });
    const gate = cur ? featPrereqOk(cur) : { ok: false };
    let detail = '<p class="pad-note">Начни вводить название…</p>';
    if (cur) {
      detail = "<p><strong>" + esc(cur.name_ru) + "</strong></p>" + (cur.prerequisites_ru ? '<p class="pad-note">Требования: ' + esc(cur.prerequisites_ru) + (gate.ok ? "" : " — сейчас не выполнены") + "</p>" : "") + "<p>" + esc(typographyToTy(cur.benefits_ru || cur.summary_ru)) + "</p>";
    }
    return '<div class="form"><label class="field">Черта<input data-feat-query placeholder="Начни вводить название…" value="' + esc(a.featDraft.query || "") + '"></label>' +
      '<div class="feat-pick-list" role="listbox" aria-label="Черты">' + rows + "</div>" + detail +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="feat-confirm"' + (cur && gate.ok ? "" : " disabled") + ">Взять черту</button></div></div>";
  }
  function renderClassSetup() {
    const cls = mainClass();
    const slug = classSlug();
    const meta = (CAT.classMeta || {})[slug] || {};
    const a = ensureAbilState();
    if (!a.classDraft) {
      const have = [];
      const skills = sheet.skills || {};
      const bgRow = (CAT.backgrounds || []).find(function (b) { return b.name_ru === (sheet.background || ""); });
      const blocked = {};
      ((bgRow && bgRow.skills) || []).forEach(function (k) { blocked[k] = true; });
      a.classBlockedSkills = blocked;
      Object.keys(skills).forEach(function (k) {
        const row = skills[k];
        const on = row && (row === true || row.p || row.prof === true || row.prof === 1 || row.prof === "half" || row.prof === "expert" || row.trained);
        if (on && (meta.skills || []).indexOf(k) >= 0 && !blocked[k]) have.push(k);
      });
      a.classDraft = { skills: have.slice(0, meta.skills_need || have.length), equip: {}, blocked: blocked };
    }
    const need = meta.skills_need || 0;
    const skillChips = (meta.skills || []).map(function (k) {
      const blocked = !!(a.classDraft.blocked && a.classDraft.blocked[k]);
      const on = !blocked && a.classDraft.skills.indexOf(k) >= 0;
      return '<button type="button" class="sheet-chip' + (on ? " is-on" : "") + (blocked ? " is-blocked" : "") + '" data-abil-act="class-skill" data-v="' + k + '"' + (blocked ? ' title="Уже есть (предыстория)" disabled' : "") + ">" + esc(SKILL_RU[k] || k) + (blocked ? " · уже есть" : "") + "</button>";
    }).join("");
    const eq = ((CAT.equipment || {})[slug] || []).map(function (line) {
      const cur = a.classDraft.equip[line.id];
      const opts = (line.options || []).map(function (o) {
        return '<button type="button" class="sheet-chip' + (cur === o.id ? " is-on" : "") + '" data-abil-act="class-eq" data-line="' + esc(line.id) + '" data-v="' + esc(o.id) + '">' + esc(o.label_ru) + "</button>";
      }).join("");
      return '<p class="section-label">' + esc(line.label_ru) + '</p><div class="pad-row" style="flex-wrap:wrap">' + opts + "</div>";
    }).join("");
    return '<div class="form"><p>Настройка уже взятого класса. Навыки, которые даёт ' + esc(cls.name) + ", и стартовые строки снаряжения из справочника.</p>" +
      (need ? '<p class="section-label">Навыки (' + a.classDraft.skills.length + "/" + need + ')</p><div class="pad-row" style="flex-wrap:wrap">' + skillChips + "</div>" : "") + eq +
      '<div class="pad-row" style="margin-top:12px"><button type="button" class="btn" data-open="subclass-setup">Сменить архетип</button><button type="button" class="btn" data-open="homebrew-class">Хомбрю-класс</button><button type="button" class="btn" data-open="level-up">+1 уровень</button></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="class-apply">Применить</button></div></div>';
  }
  function renderSubclassSetup() {
    const cls = mainClass();
    const pack = (CAT.classes || {})[classSlug()] || {};
    const a = ensureAbilState();
    const currentId = subclassSlugFor(classSlug(), cls.subclass);
    if (!a.subDraft) a.subDraft = { id: currentId };
    const chips = Object.keys(pack.subclasses || {}).map(function (id) {
      const s = pack.subclasses[id];
      return '<button type="button" class="sheet-chip' + (a.subDraft.id === id ? " is-on" : "") + '" data-abil-act="sub-pick" data-v="' + esc(id) + '">' + esc(s.name_ru) + "</button>";
    }).join("");
    const cur = pack.subclasses && pack.subclasses[a.subDraft.id];
    const changed = a.subDraft.id && a.subDraft.id !== currentId;
    const preview = cur ? "<p>Умения до текущего уровня (" + cls.level + "): " + (cur.features || []).filter(function (f) { return !f.optional && (f.level || 1) <= (cls.level || 1); }).map(function (f) { return f.name_ru; }).join(", ") + ".</p>" : "";
    return '<div class="form"><p>' + esc(cls.name) + ": настройка архетипа. Сейчас — «" + esc(cls.subclass || "—") + "».</p>" +
      '<div class="pad-row" style="flex-wrap:wrap">' + chips + "</div>" + preview +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="sub-apply"' + (changed ? "" : " disabled") + ">Применить</button></div></div>";
  }
  function renderSubclassChange() {
    const d = ensureAbilState().subChange || { fromName: "", toName: "", mode: "replace_all", copy: true, classLevel: mainClass().level };
    return '<div class="form"><p>«' + esc(d.fromName || "—") + "» → «" + esc(d.toName) + "». Уровень класса (" + d.classLevel + "), хиты и Увеличение характеристик не меняются.</p>" +
      '<div class="pad-row"><button type="button" class="sheet-chip' + (d.mode === "replace_all" ? " is-on" : "") + '" data-abil-act="sc-mode" data-v="replace_all">Все способности</button><button type="button" class="sheet-chip' + (d.mode === "future_only" ? " is-on" : "") + '" data-abil-act="sc-mode" data-v="future_only">Только будущие уровни</button></div>' +
      (d.mode === "replace_all" ? '<p class="pad-note">Старые владения, выборы и умения архетипа снимутся; новый применится целиком с порога выбора до текущего уровня класса.</p>' : '<p class="pad-note">Владения и уже открытые умения «' + esc(d.fromName || "старого архетипа") + "» до " + d.classLevel + " ур. останутся. Новый архетип откроет только умения с уровня " + (d.classLevel + 1) + "+; его стартовые владения сейчас не начисляются.</p>") +
      '<label class="sheet-check"><input type="checkbox" data-abil-act="sc-copy"' + (d.copy ? " checked" : "") + "> Скопировать текст выборов текущего архетипа в заметки</label>" +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="sc-confirm">Сменить</button></div></div>';
  }

  function raceByName(name) {
    const list = CAT.races || [];
    const n = String(name || "").toLowerCase();
    const aliases = { "горный дварф": "mountain_dwarf", "лесной эльф": "wood_elf", "высший эльф": "high_elf", "человек": "human" };
    if (aliases[n]) return list.find(function (r) { return r.slug === aliases[n]; });
    return list.find(function (r) { return r.name_ru.toLowerCase() === n; }) || list.find(function (r) { return n.indexOf(r.name_ru.toLowerCase()) >= 0 || r.name_ru.toLowerCase().indexOf(n) >= 0; });
  }
  function renderRaceSetup() {
    const a = ensureAbilState();
    const list = CAT.races || [];
    const cur = raceByName(sheet.race);
    if (!a.raceDraft) a.raceDraft = { slug: cur ? cur.slug : "", query: "" };
    const q = (a.raceDraft.query || "").trim().toLowerCase();
    const chips = list.filter(function (r) { return !q || r.name_ru.toLowerCase().indexOf(q) >= 0; }).map(function (r) {
      return '<button type="button" class="sheet-chip' + (a.raceDraft.slug === r.slug ? " is-on" : "") + '" data-abil-act="race-pick" data-v="' + esc(r.slug) + '">' + esc(r.name_ru) + "</button>";
    }).join("");
    const sel = list.find(function (r) { return r.slug === a.raceDraft.slug; });
    let detail = "";
    if (sel) {
      const asi = Object.keys(sel.ability_bonuses || {}).map(function (k) { return fmtSigned(sel.ability_bonuses[k]) + " " + (ABIL_RU[k] || k); }).join(", ");
      detail = "<p><strong>" + esc(sel.name_ru) + "</strong></p><p class=\"pad-note\">Скорость " + sel.speed + " фт. · тёмное зрение " + (sel.darkvision || 0) + " фт." + (asi ? " · " + asi : "") + "</p>" + (sel.traits_text ? "<p>" + esc(typographyToTy(sel.traits_text)) + "</p>" : "");
    }
    return '<div class="form"><label>Раса<input data-race-query placeholder="Название расы" value="' + esc(a.raceDraft.query || "") + '"></label>' +
      '<div class="pad-row" style="flex-wrap:wrap;max-height:28vh;overflow:auto">' + chips + "</div>" + detail +
      '<div class="pad-row"><button type="button" class="btn" data-open="homebrew-race">Хомбрю-раса</button></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="race-apply"' + (sel ? "" : " disabled") + ">Применить</button></div></div>";
  }
  function renderBgSetup() {
    const a = ensureAbilState();
    const list = CAT.backgrounds || [];
    if (!a.bgDraft) {
      const cur = list.find(function (b) { return b.name_ru === sheet.background; });
      a.bgDraft = { slug: cur ? cur.slug : "", query: "" };
    }
    const q = (a.bgDraft.query || "").trim().toLowerCase();
    const chips = list.filter(function (b) { return !q || b.name_ru.toLowerCase().indexOf(q) >= 0; }).map(function (b) {
      return '<button type="button" class="sheet-chip' + (a.bgDraft.slug === b.slug ? " is-on" : "") + '" data-abil-act="bg-pick" data-v="' + esc(b.slug) + '">' + esc(b.name_ru) + "</button>";
    }).join("");
    const sel = list.find(function (b) { return b.slug === a.bgDraft.slug; });
    let detail = "";
    if (sel) {
      const skills = (sel.skills || []).map(function (k) { return SKILL_RU[k] || k; }).join(", ");
      detail = "<p><strong>" + esc(sel.name_ru) + "</strong>" + (sel.feature_name_ru ? " · " + esc(sel.feature_name_ru) : "") + "</p>" + (skills ? '<p class="pad-note">Навыки: ' + esc(skills) + "</p>" : "") + (sel.feature_text_ru ? "<p>" + esc(typographyToTy(sel.feature_text_ru)) + "</p>" : "");
    }
    return '<div class="form"><label>Предыстория<input data-bg-query placeholder="Название предыстории" value="' + esc(a.bgDraft.query || "") + '"></label>' +
      '<div class="pad-row" style="flex-wrap:wrap;max-height:28vh;overflow:auto">' + chips + "</div>" + detail +
      '<div class="pad-row"><button type="button" class="btn" data-open="homebrew-bg">Хомбрю-предыстория</button></div>' +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="bg-apply"' + (sel ? "" : " disabled") + ">Применить</button></div></div>";
  }
  function renderHomebrew(kind) {
    const a = ensureAbilState();
    const key = kind === "class" ? "hbClass" : kind === "race" ? "hbRace" : "hbBg";
    const titleName = kind === "class" ? "класса" : kind === "race" ? "расы" : "предыстории";
    const val = a[key] || "";
    const ph = kind === "class" ? "Например: Ведьмак" : kind === "race" ? "Название расы" : "Название предыстории";
    const hint = kind === "race" ? "Своя раса: укажи название на листе. Скорость, тёмное зрение, языки, характеристики и особенности задаёшь сам — из справочника ничего не подставляем." : kind === "bg" ? "Своя предыстория: только название на листе. Владения и таблицы задаёшь сам." : "Свой класс: укажи название на листе.";
    const can = String(val).trim().length > 0;
    return '<div class="form"><p>' + esc(hint) + "</p><label>Название на листе<input data-hb-name data-kind=\"" + kind + "\" placeholder=\"" + esc(ph) + "\" value=\"" + esc(val) + "\"></label>" +
      (can ? "" : '<p class="pad-note">Введи название ' + titleName + ".</p>") +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="hb-apply" data-kind="' + kind + '"' + (can ? "" : " disabled") + ">Применить</button></div></div>";
  }
  function renderFeatureForm() {
    const a = ensureAbilState();
    if (!a.customDraft) a.customDraft = { id: "", nameRu: "", summaryRu: "" };
    const d = a.customDraft;
    return '<div class="form"><p>Своя способность на этом листе: название и текст.</p>' +
      '<label>Название<input data-custom-name value="' + esc(d.nameRu) + '" placeholder="Название способности"></label>' +
      '<label>Текст<textarea data-custom-text rows="5" placeholder="Что она делает">' + esc(d.summaryRu) + "</textarea></label>" +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="custom-save"' + (String(d.nameRu || "").trim() ? "" : " disabled") + ">Сохранить</button></div></div>";
  }
  function renderInvocations() {
    return '<div class="form"><p>Известные воззвания. Пассивные просто справочник; «по желанию» — отметь использование (ячейку не тратит).</p><p class="pad-note">Нет воззваний — выбери их в умении «Мистические воззвания».</p><div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-close>Закрыть</button></div></div>';
  }
  function renderRangerFavored() {
    return '<div class="form"><p>Враги и местности с листа. Отметь, что применил преимущество или осведомлённость (ячейку трать отдельно в умении).</p><p><strong>Избранные враги</strong></p><p class="pad-note">Не выбраны — умение 1 ур.</p><p><strong>Избранные местности</strong></p><p class="pad-note">Не выбраны — умение 1 ур.</p><div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-close>Закрыть</button></div></div>';
  }
  function renderArcaneRecovery() {
    const a = ensureAbilState();
    if (!a.recover) a.recover = {};
    const lvl = mainClass().level || 10;
    const budget = Math.ceil(lvl / 2);
    const usedCharge = !!a.recoveryUsed;
    let cost = 0;
    const rows = [];
    for (let level = 1; level <= 5; level++) {
      const slot = (sheet.slots && sheet.slots[level]) || { cur: 0, max: 0 };
      const spent = Math.max(0, (slot.max || 0) - (slot.cur || 0));
      const picked = a.recover[level] || 0;
      cost += level * picked;
      const nextCost = cost - level * picked + level * (picked + 1);
      rows.push("<div class='pad-row' style='justify-content:space-between'><div><b>" + level + " ур.</b> <span class='pad-note'>Потрачено " + spent + "/" + (slot.max || 0) + (spent <= 0 ? " · нечего возвращать" : "") + "</span></div><div class='pad-row'><button type='button' class='btn' data-abil-act='rec-dec' data-v='" + level + "'" + (picked <= 0 || usedCharge ? " disabled" : "") + ">−</button><strong style='min-width:1.5rem;text-align:center'>" + picked + "</strong><button type='button' class='btn' data-abil-act='rec-inc' data-v='" + level + "'" + (usedCharge || picked >= spent || nextCost > budget ? " disabled" : "") + ">+</button></div></div>");
    }
    return '<div class="form"><p>Лимит суммы уровней ячеек: <strong>' + budget + "</strong> (½ ур. волшебника · ур. " + lvl + ", вверх). Без ячеек 6+. Раз в день после короткого отдыха.</p>" +
      '<p class="pad-note">Заряд умения: ' + (usedCharge ? 0 : 1) + "/1 · выбрано " + cost + "/" + budget + "</p>" + rows.join("") +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn" data-close>Закрыть</button><button type="button" class="btn primary" data-abil-act="rec-confirm"' + (usedCharge || cost <= 0 || cost > budget ? " disabled" : "") + ">Восстановить (потратить заряд)</button></div></div>";
  }
  function renderTransmuterStone() {
    const a = ensureAbilState();
    const cur = a.stone || "darkvision";
    const chips = (CAT.transmuterStone || []).map(function (s) {
      return '<button type="button" class="sheet-chip' + (cur === s.id ? " is-on" : "") + '" data-abil-act="stone-pick" data-v="' + esc(s.id) + '">' + esc(s.name_ru) + "</button>";
    }).join("");
    const def = (CAT.transmuterStone || []).find(function (s) { return s.id === cur; });
    return '<div class="form"><p>Камень преобразующего: выбери одно свойство, пока камень при тебе. Новый камень — после продолжительного отдыха.</p>' +
      '<div class="pad-row" style="flex-wrap:wrap">' + chips + "</div>" + (def ? "<p>" + esc(typographyToTy(def.summary_ru)) + "</p>" : "") +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="stone-apply">Применить</button></div></div>';
  }
  function renderWizardFeature() {
    const id = (ensureAbilState().wizardFeatureId) || "minor_alchemy";
    if (id === "arcane_recovery") return renderArcaneRecovery();
    if (id === "transmuter_stone" || id === "transmuters_stone") return renderTransmuterStone();
    const a = ensureAbilState();
    return '<div class="form"><p>Малая алхимия: коснись немагического предмета не больше 1 куб. фт. и преврати дерево, камень, железо, медь или серебро в другой такой материал. Действие, концентрация до 1 часа.</p>' +
      '<label>Предмет<input data-wiz-obj placeholder="Немагический предмет, который ты видел" value="' + esc(a.wizardObject || "") + '"></label>' +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="wiz-apply">Применить</button></div></div>';
  }
  function renderChannel() {
    const max = sheet.channelMax || 1;
    const cur = sheet.channelCur != null ? sheet.channelCur : max;
    const cls = mainClass();
    let body = "<p>Божественный канал: " + cur + "/" + max + ", сбрасывается после короткого или продолжительного отдыха.</p>";
    if (classSlug() === "cleric") {
      body += "<p>Изгнание нежити: действием предъяви священный символ — нежить в 30 фт., которая тебя видит и слышит, делает спас Мудрости или изгнана на 1 минуту.</p>";
      body += "<p>Сохранение жизни: действием раздай " + (5 * (cls.level || 5)) + " хитов (5 × уровень жреца) существам в 30 фт. Никто не получает больше половины своего максимума.</p>";
    }
    if (classSlug() === "paladin") body += "<p>Клятва Преданности: священное оружие или изгнание нечестивых — как в умении клятвы.</p>";
    return '<div class="form">' + typographyToTy(body) + '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="channel-spend"' + (cur <= 0 ? " disabled" : "") + ">Использовать</button></div></div>";
  }
  function renderPreserveLife() {
    const max = sheet.channelMax || 1;
    const cur = sheet.channelCur != null ? sheet.channelCur : max;
    const pool = 5 * (mainClass().level || 5);
    return '<div class="form"><p>Сохранение жизни: действием (тратит канал) раздай ' + pool + " хитов существам в 30 фт. Каждое существо — не выше половины своего максимума.</p><p class=\"pad-note\">Канал: " + cur + "/" + max + "</p>" +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="channel-spend"' + (cur <= 0 ? " disabled" : "") + ">Использовать</button></div></div>";
  }
  function renderHands() {
    const max = sheet.handsMax != null ? sheet.handsMax : (classSlug() === "paladin" ? 5 * (mainClass().level || 5) : 0);
    const cur = sheet.handsCur != null ? sheet.handsCur : max;
    if (classSlug() !== "paladin") return '<div class="form"><p>Возложение рук — умение паладина. У этого персонажа его нет.</p><div class="modal-actions"><button type="button" class="btn primary" data-close>Закрыть</button></div></div>';
    const a = ensureAbilState();
    if (a.handsSpend == null) a.handsSpend = Math.min(5, cur);
    return '<div class="form"><p>Пул хитов: ' + cur + "/" + max + ". Действием касанием лечишь существо или тратишь 5 хитов пула, чтобы снять одну болезнь или яд.</p>" +
      '<label>Потратить<input data-hands-amt type="number" min="1" max="' + cur + '" value="' + a.handsSpend + '"></label>' +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="hands-spend"' + (cur <= 0 ? " disabled" : "") + ">Возложить руки</button></div></div>";
  }
  function renderDivineSense() {
    const max = 1 + abilityModOf(scoreTotal("cha", true));
    const cur = sheet.senseCur != null ? sheet.senseCur : max;
    return '<div class="form"><p>Божественное чувство: действием до конца своего следующего хода чувствуешь место и тип целиала, исчадия или нежити в 60 фт., а также освящённые или осквернённые предметы и места. Использований: ' + cur + "/" + max + " (1 + модификатор Харизмы), прод. отдых.</p>" +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="sense-spend"' + (cur <= 0 ? " disabled" : "") + ">Использовать</button></div></div>";
  }
  function renderDivineSmite() {
    if (classSlug() !== "paladin") return '<div class="form"><p>Божественная кара — умение паладина. У этого персонажа его нет.</p><div class="modal-actions"><button type="button" class="btn primary" data-close>Закрыть</button></div></div>';
    const a = ensureAbilState();
    const lv = a.smiteLv || 1;
    const opts = [];
    for (let i = 1; i <= 4; i++) {
      const s = sheet.slots && sheet.slots[i];
      if (s && s.max > 0) opts.push('<button type="button" class="sheet-chip' + (i === lv ? " is-on" : "") + '" data-abil-act="smite-lv" data-v="' + i + '">' + i + " ур. (" + s.cur + "/" + s.max + ")</button>");
    }
    return '<div class="form"><p>Когда попадаешь рукопашной атакой оружием, потрать ячейку: цель получает ' + (2 + (lv - 1)) + "к8 излучением (+1к8 за круг выше 1, макс. 5к8; ещё +1к8 по нежити или исчадию).</p>" +
      '<div class="pad-row" style="flex-wrap:wrap">' + opts.join("") + "</div>" +
      '<div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button type="button" class="btn primary" data-abil-act="smite-go">Кара</button></div></div>';
  }
  function renderMaxHpFixed() {
    const cls = mainClass();
    const slug = classSlug();
    const die = ((CAT.classMeta || {})[slug] || {}).hit_die || 8;
    const con = conMod();
    const tough = hasDwarvenToughness();
    const avg = Math.floor(die / 2) + 1;
    const first = die;
    const later = Math.max(0, (cls.level || sheet.level) - 1) * avg;
    const conTot = con * (sheet.level || 1);
    const toughTot = tough ? (sheet.level || 1) : 0;
    const total = first + later + conTot + toughTot;
    return '<p class="pad-lead">Разборка максимума хитов.</p><ul class="breakdown live">' +
      "<li><span>" + esc(cls.name) + " 1 ур. · к" + die + '</span><b class="num">' + first + "</b></li>" +
      (cls.level > 1 ? "<li><span>" + esc(cls.name) + " 2–" + cls.level + " ур. · среднее ⌊к" + die + "/2⌋+1</span><b class=\"num\">" + later + "</b></li>" : "") +
      "<li><span>Модификатор Телосложения (" + fmtSigned(con) + ") × " + sheet.level + ' ур.</span><b class="num">' + conTot + "</b></li>" +
      "<li><span>Дварфийская стойкость" + (tough ? " (холмовой дварф)" : "") + '</span><b class="num">' + toughTot + "</b></li>" +
      '<li><span>Черты и прочие бонусы</span><b class="num">0</b></li>' +
      '<li><span>Итого</span><b class="num">' + sheet.hpMax + "</b></li></ul>" +
      '<p class="pad-note">' + (tough ? "Холмовой дварф получает +1 хит за уровень." : "Горный дварф не получает «Дварфийскую стойкость» (+1 хит/уровень есть у холмового).") + " Итог на листе: " + sheet.hpMax + (total === sheet.hpMax ? " — сходится." : " (формула среднего: " + total + ").") + "</p>" +
      '<div class="pad-row"><button type="button" class="btn" data-sheet-act="hp-back">Назад к паду хитов</button></div>';
  }
  function extendIdentity(html) {
    const a = ensureAbilState();
    const pending = [];
    if (a.pendingAsi) pending.push('<button type="button" class="chip" data-open="asi">Увеличение характеристик</button>');
    if (a.pendingSteps && a.pendingSteps.length) pending.push('<button type="button" class="chip" data-open="guided">Продолжить повышение</button>');
    const setup = '<p class="section-label">Настройка</p><div class="chips" style="flex-wrap:wrap"><button type="button" class="chip" data-open="race-setup">Раса</button><button type="button" class="chip" data-open="class-setup">Класс</button><button type="button" class="chip" data-open="subclass-setup">Архетип</button><button type="button" class="chip" data-open="bg-setup">Предыстория</button>' + pending.join("") + '<button type="button" class="chip" data-open="homebrew-class">Хомбрю-класс</button><button type="button" class="chip" data-open="homebrew-race">Хомбрю-раса</button><button type="button" class="chip" data-open="homebrew-bg">Хомбрю-предыстория</button></div>';
    const htmlStr = String(html || "");
    const marker = '<div class="pad-grid pad-grid--2">';
    if (htmlStr.indexOf(marker) >= 0) return htmlStr.replace(marker, setup + marker);
    return htmlStr + setup;
  }

  const _renderIdentity = LIVE.identity && LIVE.identity.body;
  LIVE.identity = { title: "Основное", wide: true, body: function () { return extendIdentity(typeof _renderIdentity === "function" ? _renderIdentity() : ""); } };
  LIVE["level-up"] = { title: "Повышение уровня", body: renderLevelUp };
  LIVE["max-hp"] = { title: "Макс. хиты по уровням", body: renderMaxHpFixed };
  LIVE.asi = { title: "Увеличение характеристик", body: renderAsi };
  LIVE["feat-setup"] = { title: "Черта", wide: true, body: renderFeatSetup };
  LIVE["class-setup"] = { title: function () { return (mainClass().name || "Класс") + ": настройка класса"; }, wide: true, body: renderClassSetup };
  LIVE["subclass-setup"] = { title: function () { return (mainClass().name || "Класс") + ": настройка архетипа"; }, wide: true, body: renderSubclassSetup };
  LIVE["subclass-change"] = { title: "Сменить архетип?", body: renderSubclassChange };
  LIVE["race-setup"] = { title: function () {
    const list = CAT.races || [];
    const sel = list.find(function (r) { return r.slug === ((ensureAbilState().raceDraft || {}).slug); }) || raceByName(sheet.race);
    return (sel ? sel.name_ru : (sheet.race || "Раса")) + ": настройка расы";
  }, wide: true, body: renderRaceSetup };
  LIVE["bg-setup"] = { title: function () {
    const list = CAT.backgrounds || [];
    const slug = (ensureAbilState().bgDraft || {}).slug;
    const sel = list.find(function (b) { return b.slug === slug; }) || list.find(function (b) { return b.name_ru === sheet.background; });
    return (sel ? sel.name_ru : (sheet.background || "Предыстория")) + ": настройка предыстории";
  }, wide: true, body: renderBgSetup };
  LIVE.guided = { title: "Повышение уровня", wide: true, body: renderGuided };
  LIVE.invocations = { title: "Мистические воззвания", wide: true, body: renderInvocations };
  LIVE["ranger-favored"] = { title: "Избранное следопыта", wide: true, body: renderRangerFavored };
  LIVE["feature-form"] = { title: "Своя способность", body: renderFeatureForm };
  LIVE["res-arcane"] = { title: "Магическое восстановление", wide: true, body: renderArcaneRecovery };
  LIVE["wizard-feature"] = { title: function () {
    const id = (ensureAbilState().wizardFeatureId) || "minor_alchemy";
    if (id === "arcane_recovery") return "Магическое восстановление";
    if (id === "transmuter_stone" || id === "transmuters_stone") return "Камень преобразующего";
    return "Малая алхимия";
  }, body: renderWizardFeature };
  LIVE["transmuter-stone"] = { title: "Камень преобразующего", body: renderTransmuterStone };
  LIVE["res-channel"] = { title: "Божественный канал", body: renderChannel };
  LIVE.channel = { title: "Божественный канал", body: renderChannel };
  LIVE["preserve-life"] = { title: "Сохранение жизни", body: renderPreserveLife };
  LIVE["res-hands"] = { title: "Возложение рук", body: renderHands };
  LIVE["divine-sense"] = { title: "Божественное чувство", body: renderDivineSense };
  LIVE["divine-smite"] = { title: "Божественная кара", body: renderDivineSmite };
  LIVE["homebrew-class"] = { title: "Хомбрю-класс", body: function () { return renderHomebrew("class"); } };
  LIVE["homebrew-race"] = { title: "Хомбрю-раса", body: function () { return renderHomebrew("race"); } };
  LIVE["homebrew-bg"] = { title: "Хомбрю-предыстория", body: function () { return renderHomebrew("bg"); } };

  const _canOpen = typeof canOpenClassDialog === "function" ? canOpenClassDialog : function () { return true; };
  canOpenClassDialog = function (id, kind) {
    if (id === "feature-form") return true;
    if (id === "invocations") return classSlug() === "warlock";
    if (id === "ranger-favored") return classSlug() === "ranger";
    if (id === "res-arcane" || id === "wizard-feature" || id === "transmuter-stone") return classSlug() === "wizard";
    if (id === "res-hands" || id === "divine-smite" || id === "divine-sense") return classSlug() === "paladin";
    if (id === "preserve-life") return classSlug() === "cleric" && /жизн/i.test(mainClass().subclass || "");
    if (id === "res-channel" || id === "channel") return classSlug() === "cleric" || classSlug() === "paladin";
    if (id === "asi") return !!(ensureAbilState().pendingAsi);
    return _canOpen(id, kind);
  };
  const _openDialogInner = openDialog;
  openDialog = function (id) {
    if (id === "feature-form") {
      const a = ensureAbilState();
      if (!a.customDraft || !a.customDraft._keep) a.customDraft = { id: "", nameRu: "", summaryRu: "" };
    }
    if (id === "level-up") resetLevelUpDraft();
    if (id === "race-setup") ensureAbilState().raceDraft = null;
    if (id === "bg-setup") ensureAbilState().bgDraft = null;
    if (id === "class-setup") ensureAbilState().classDraft = null;
    if (id === "subclass-setup") ensureAbilState().subDraft = null;
    if (id === "res-arcane") ensureAbilState().recover = {};
    return _openDialogInner(id);
  };
  function liveRefresh() { if (typeof refreshLive === "function") refreshLive(); }

  function applyAsiConfirm() {
    const a = ensureAbilState();
    const d = a.pendingAsi;
    if (!d) return;
    if (d.mode === "feat") {
      if (!d.feat) return;
      a.feats = a.feats || [];
      a.feats.push(d.feat);
      toast("Черта: " + d.feat.name_ru);
    } else {
      Object.keys(d.scores || {}).forEach(function (k) {
        const add = d.scores[k] || 0;
        if (!add) return;
        if (!sheet.abilityBase) sheet.abilityBase = {};
        sheet.abilityBase[k] = (sheet.abilityBase[k] || 10) + add;
      });
      if (typeof syncAbilityRail === "function") syncAbilityRail();
      if (typeof syncHeader === "function") syncHeader();
      toast("Характеристики увеличены");
    }
    a.pendingAsi = null;
    a.pendingSteps = (a.pendingSteps || []).filter(function (s) { return s.type !== "asi"; });
    closeDialog();
    if (a.pendingSteps.length) { a.guidedIndex = 0; openDialog("guided"); }
    renderFeaturesScene();
  }

  document.addEventListener("click", function (e) {
    const t = e.target.closest("[data-abil-toggle],[data-abil-act]");
    if (!t) return;
    if (t.hasAttribute("data-abil-toggle")) {
      const key = t.getAttribute("data-abil-toggle");
      const a = ensureAbilState();
      a.openKeys[key] = !a.openKeys[key];
      renderFeaturesScene();
      return;
    }
    const act = t.getAttribute("data-abil-act");
    if (!act || t.hasAttribute("disabled")) return;
    const a = ensureAbilState();
    const v = t.getAttribute("data-v");
    if (act === "collapse-feats") { a.openKeys = {}; renderFeaturesScene(); return; }
    if (act === "expand-feats") { a.openKeys = {}; (a._toggleKeys || []).forEach(function (k) { a.openKeys[k] = true; }); renderFeaturesScene(); return; }
    if (act === "lu-mode") { a.levelUp.mode = v; liveRefresh(); return; }
    if (act === "lu-hp") { a.levelUp.hpMode = v; liveRefresh(); return; }
    if (act === "lu-class") { a.levelUp.newClass = v; liveRefresh(); return; }
    if (act === "lu-confirm") {
      const d = a.levelUp;
      if (d.mode !== "same") { toast("Мультикласс в этом пресете не применяется — только просмотр требований"); return; }
      const die = (((CAT.classMeta || {})[classSlug()] || {}).hit_die || 8);
      const gain = d.hpMode === "average" ? averageHpGain(die, conMod(), { dwarvenToughness: hasDwarvenToughness() }) : Math.floor(Number(d.manualHp));
      applySameClassLevelUp(gain);
      return;
    }
    if (act === "asi-mode") { if (!a.pendingAsi) return; a.pendingAsi.mode = v; a.pendingAsi.scores = {}; liveRefresh(); return; }
    if (act === "asi-score") {
      if (!a.pendingAsi) return;
      const d = a.pendingAsi;
      const cur = d.scores[v] || 0;
      if (d.mode === "plus2") { d.scores = {}; if (!cur) d.scores[v] = 2; }
      else if (cur) delete d.scores[v];
      else if (Object.keys(d.scores).filter(function (k) { return d.scores[k]; }).length < 2) d.scores[v] = 1;
      liveRefresh();
      return;
    }
    if (act === "asi-confirm") { applyAsiConfirm(); return; }
    if (act === "feat-pick") { a.featDraft = a.featDraft || {}; a.featDraft.slug = v; liveRefresh(); return; }
    if (act === "feat-confirm") {
      const feat = (CAT.feats || []).find(function (f) { return f.slug === (a.featDraft || {}).slug; });
      if (!feat || !featPrereqOk(feat).ok) return;
      if (!a.pendingAsi) a.pendingAsi = { mode: "feat", scores: {}, feat: feat };
      a.pendingAsi.feat = feat;
      a.pendingAsi.mode = "feat";
      closeDialog();
      openDialog((a.pendingSteps && a.pendingSteps.length) ? "guided" : "asi");
      return;
    }
    if (act === "book-pick") {
      a.bookPicks = a.bookPicks || [];
      const i = a.bookPicks.indexOf(v);
      if (i >= 0) a.bookPicks.splice(i, 1);
      else if (a.bookPicks.length < 2) a.bookPicks.push(v);
      liveRefresh();
      return;
    }
    if (act === "book-confirm") {
      if (!a.bookPicks || a.bookPicks.length !== 2) return;
      const names = a.bookPicks.map(function (slug) { const s = (CAT.wizardSpells || []).find(function (x) { return x.slug === slug; }); return s ? s.name_ru : slug; });
      a.spellbook = (a.spellbook || []).concat(a.bookPicks);
      a.pendingSteps = (a.pendingSteps || []).filter(function (s) { return s.type !== "spellbook"; });
      toast("В книгу: " + names.join(", "));
      closeDialog();
      if (a.pendingSteps.length) { a.guidedIndex = 0; openDialog("guided"); }
      return;
    }
    if (act === "class-skill") {
      const need = ((CAT.classMeta || {})[classSlug()] || {}).skills_need || 0;
      const arr = a.classDraft.skills;
      const i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1);
      else if (arr.length < need) arr.push(v);
      liveRefresh();
      return;
    }
    if (act === "class-eq") { a.classDraft.equip[t.getAttribute("data-line")] = v; liveRefresh(); return; }
    if (act === "class-apply") { toast("Настройка класса сохранена"); closeDialog(); return; }
    if (act === "sub-pick") { a.subDraft.id = v; liveRefresh(); return; }
    if (act === "sub-apply") {
      const pack = (CAT.classes || {})[classSlug()] || {};
      const to = pack.subclasses && pack.subclasses[a.subDraft.id];
      if (!to) return;
      a.subChange = { fromName: mainClass().subclass, toName: to.name_ru, toId: a.subDraft.id, mode: "replace_all", copy: true, classLevel: mainClass().level };
      closeDialog();
      openDialog("subclass-change");
      return;
    }
    if (act === "sc-mode") { a.subChange.mode = v; liveRefresh(); return; }
    if (act === "sc-copy") { a.subChange.copy = t.checked; return; }
    if (act === "sc-confirm") {
      const d = a.subChange;
      if (classItems && classItems[0]) classItems[0].subclass = d.toName;
      mainClass().subclass = d.toName;
      if (typeof layoutClassRow === "function") layoutClassRow();
      toast("Архетип: " + d.toName);
      closeDialog();
      renderFeaturesScene();
      return;
    }
    if (act === "race-pick") { a.raceDraft.slug = v; liveRefresh(); return; }
    if (act === "race-apply") {
      const sel = (CAT.races || []).find(function (r) { return r.slug === a.raceDraft.slug; });
      if (!sel) return;
      sheet.race = sel.name_ru.indexOf("Дварф (горный)") === 0 ? "Горный дварф" : sel.name_ru.indexOf("Эльф (лесной)") === 0 ? "Лесной эльф" : sel.name_ru.indexOf("Эльф (высший)") === 0 ? "Высший эльф" : sel.name_ru;
      sheet.speeds = sheet.speeds || {};
      sheet.speeds.walk = sel.speed;
      if (typeof setDarkvisionBase === "function") setDarkvisionBase(sel.darkvision || 0);
      else { sheet.darkvisionBase = sel.darkvision || 0; sheet.darkvisionEff = sel.darkvision || 0; }
      if (typeof syncHeader === "function") syncHeader();
      toast(sheet.race);
      closeDialog();
      renderFeaturesScene();
      return;
    }
    if (act === "bg-pick") { a.bgDraft.slug = v; liveRefresh(); return; }
    if (act === "bg-apply") {
      const sel = (CAT.backgrounds || []).find(function (b) { return b.slug === a.bgDraft.slug; });
      if (!sel) return;
      sheet.background = sel.name_ru;
      if (typeof syncHeader === "function") syncHeader();
      toast(sel.name_ru);
      closeDialog();
      renderFeaturesScene();
      return;
    }
    if (act === "hb-apply") {
      const kind = t.getAttribute("data-kind");
      const name = String(a[kind === "class" ? "hbClass" : kind === "race" ? "hbRace" : "hbBg"] || "").trim();
      if (!name) return;
      if (kind === "class") { if (classItems && classItems[0]) classItems[0].name = name; mainClass().name = name; }
      if (kind === "race") sheet.race = name;
      if (kind === "bg") sheet.background = name;
      if (typeof layoutClassRow === "function") layoutClassRow();
      if (typeof syncHeader === "function") syncHeader();
      toast(name);
      closeDialog();
      renderFeaturesScene();
      return;
    }
    if (act === "custom-save") {
      const name = String((a.customDraft || {}).nameRu || "").trim();
      if (!name) return;
      const row = { id: a.customDraft.id || ("custom-" + Date.now()), nameRu: name, summaryRu: a.customDraft.summaryRu || "" };
      a.custom = (a.custom || []).filter(function (x) { return x.id !== row.id; });
      a.custom.push(row);
      toast(name);
      closeDialog();
      renderFeaturesScene();
      return;
    }
    if (act === "edit-custom") {
      const row = (a.custom || []).find(function (x) { return x.id === t.getAttribute("data-id"); });
      a.customDraft = row ? { id: row.id, nameRu: row.nameRu, summaryRu: row.summaryRu, _keep: true } : { id: "", nameRu: "", summaryRu: "" };
      openDialog("feature-form");
      return;
    }
    if (act === "del-custom") { a.custom = (a.custom || []).filter(function (x) { return x.id !== t.getAttribute("data-id"); }); renderFeaturesScene(); return; }
    if (act === "rec-inc" || act === "rec-dec") { const lv = Number(v); a.recover = a.recover || {}; a.recover[lv] = Math.max(0, (a.recover[lv] || 0) + (act === "rec-inc" ? 1 : -1)); liveRefresh(); return; }
    if (act === "rec-confirm") {
      let cost = 0;
      Object.keys(a.recover || {}).forEach(function (lv) {
        const n = a.recover[lv] || 0;
        cost += Number(lv) * n;
        if (!n || !sheet.slots[lv]) return;
        sheet.slots[lv].cur = Math.min(sheet.slots[lv].max, (sheet.slots[lv].cur || 0) + n);
        if (typeof setSlots === "function") setSlots(String(lv), sheet.slots[lv].cur, sheet.slots[lv].max);
      });
      a.recoveryUsed = true;
      toast("Восстановлено ячеек на сумму " + cost);
      closeDialog();
      renderFeaturesScene();
      return;
    }
    if (act === "stone-pick") { a.stone = v; a.featurePicks.transmuter_stone = v; liveRefresh(); return; }
    if (act === "stone-apply") {
      const def = (CAT.transmuterStone || []).find(function (s) { return s.id === a.stone; });
      toast((def && def.name_ru) || "Камень преобразующего");
      closeDialog();
      renderFeaturesScene();
      return;
    }
    if (act === "wiz-apply") { toast("Малая алхимия" + (a.wizardObject ? ": " + a.wizardObject : "")); closeDialog(); return; }
    if (act === "channel-spend") {
      if ((sheet.channelCur != null ? sheet.channelCur : sheet.channelMax) <= 0) return;
      sheet.channelCur = (sheet.channelCur != null ? sheet.channelCur : sheet.channelMax) - 1;
      if (sheet.channel) { sheet.channel.cur = sheet.channelCur; sheet.channel.max = sheet.channelMax || sheet.channel.max; }
      toast("Божественный канал: " + sheet.channelCur + "/" + sheet.channelMax);
      closeDialog();
      renderFeaturesScene();
      return;
    }
    if (act === "hands-spend") {
      const amt = Math.max(1, Math.floor(Number(a.handsSpend || 1)));
      sheet.handsCur = Math.max(0, (sheet.handsCur != null ? sheet.handsCur : sheet.handsMax) - amt);
      toast("Возложение рук: " + sheet.handsCur + "/" + sheet.handsMax);
      closeDialog();
      renderFeaturesScene();
      return;
    }
    if (act === "sense-spend") {
      const max = 1 + abilityModOf(scoreTotal("cha", true));
      sheet.senseCur = Math.max(0, (sheet.senseCur != null ? sheet.senseCur : max) - 1);
      toast("Божественное чувство: " + sheet.senseCur + "/" + max);
      closeDialog();
      return;
    }
    if (act === "smite-lv") { a.smiteLv = Number(v); liveRefresh(); return; }
    if (act === "smite-go") {
      const lv = a.smiteLv || 1;
      if (!sheet.slots[lv] || sheet.slots[lv].cur <= 0) { toast("Нет ячейки " + lv + " круга"); return; }
      sheet.slots[lv].cur -= 1;
      if (typeof setSlots === "function") setSlots(String(lv), sheet.slots[lv].cur, sheet.slots[lv].max);
      toast("Божественная кара: " + (2 + (lv - 1)) + "к8 излучением");
      closeDialog();
      return;
    }
    if (act === "pick-style") { a.featurePicks.fighting_style_paladin = v; renderFeaturesScene(); return; }
  });

  document.addEventListener("input", function (e) {
    const el = e.target;
    if (!el.matches) return;
    const a = ensureAbilState();
    if (el.matches("[data-feat-search]")) { a.query = el.value; renderFeaturesScene(); return; }
    if (el.matches("[data-lu-manual]")) { a.levelUp.manualHp = el.value; liveRefresh(); return; }
    if (el.matches("[data-feat-query]")) { a.featDraft = a.featDraft || {}; a.featDraft.query = el.value; liveRefresh(); return; }
    if (el.matches("[data-book-query]")) { a.bookQuery = el.value; liveRefresh(); return; }
    if (el.matches("[data-race-query]")) { a.raceDraft.query = el.value; liveRefresh(); return; }
    if (el.matches("[data-bg-query]")) { a.bgDraft.query = el.value; liveRefresh(); return; }
    if (el.matches("[data-custom-name]")) { a.customDraft.nameRu = el.value; return; }
    if (el.matches("[data-custom-text]")) { a.customDraft.summaryRu = el.value; return; }
    if (el.matches("[data-hb-name]")) {
      const kind = el.getAttribute("data-kind");
      if (kind === "class") a.hbClass = el.value;
      else if (kind === "race") a.hbRace = el.value;
      else a.hbBg = el.value;
      return;
    }
    if (el.matches("[data-hands-amt]")) { a.handsSpend = el.value; return; }
    if (el.matches("[data-wiz-obj]")) { a.wizardObject = el.value; return; }
  });

  applyFeatFilter = function () {
    const a = ensureAbilState();
    const btn = document.querySelector("[data-feat-filter].is-on");
    a.filter = btn ? btn.getAttribute("data-feat-filter") : "all";
    const qEl = document.querySelector("[data-feat-search]");
    a.query = qEl ? qEl.value : "";
    renderFeaturesScene();
  };

  const _setDemoChar = setDemoChar;
  setDemoChar = function (id) {
    const a = ensureAbilState();
    a.filter = "all"; a.query = ""; a.openKeys = {}; a.custom = []; a.pendingSteps = []; a.pendingAsi = null; a.recoveryUsed = false; a.leveledFrom = null; a.featurePicks = {}; a.feats = []; a.bookPicks = [];
    _setDemoChar(id);
    const preset = (typeof DEMO_CHARS !== "undefined") ? (DEMO_CHARS[id] || DEMO_CHARS.kaedrin) : null;
    if (preset && preset.slots) {
      sheet.slots = JSON.parse(JSON.stringify(preset.slots));
    } else applySlotTable(classSlug(), mainClass().level || sheet.level);
    if (classSlug() === "cleric") { sheet.channelMax = (mainClass().level >= 6) ? 2 : 1; sheet.channelCur = sheet.channelMax; }
    else if (classSlug() === "paladin") {
      sheet.channelMax = 1; sheet.channelCur = 1;
      sheet.handsMax = 5 * (mainClass().level || 5); sheet.handsCur = sheet.handsMax;
      sheet.senseCur = 1 + abilityModOf(scoreTotal("cha", true));
    }
    if (typeof applyMagicForDemoChar === "function") applyMagicForDemoChar(id);
    renderFeaturesScene();
    if (typeof syncClassTools === "function") syncClassTools();
  };

  window.SheetProto = window.SheetProto || {};
  window.SheetProto.setDemoChar = setDemoChar;
  window.SheetProto.openDialog = openDialog;
  window.SheetProto.renderFeaturesScene = renderFeaturesScene;
  window.SheetProto.prepareSubclassChange = function (fromName, toName, toId) {
    const a = ensureAbilState();
    a.subChange = { fromName: fromName, toName: toName, toId: toId, mode: "replace_all", copy: true, classLevel: mainClass().level };
  };
  window.SheetProto.ensureXpReady = function () {
    if (sheet.xp < sheet.xpNext) sheet.xp = sheet.xpNext;
    if (typeof applyXpFace === "function") applyXpFace({ xp: sheet.xp, xpNext: sheet.xpNext, level: sheet.level, nextLevel: sheet.nextLevel });
    else if (typeof renderXpLabel === "function") renderXpLabel();
  };
  window.SheetProto.spendSlotsForRecovery = function (map) {
    Object.keys(map || {}).forEach(function (lv) {
      const n = map[lv];
      if (!sheet.slots[lv]) return;
      sheet.slots[lv].cur = Math.max(0, (sheet.slots[lv].max || 0) - n);
    });
  };

  if (!document.getElementById("abil-step7-css")) {
    const st = document.createElement("style");
    st.id = "abil-step7-css";
    st.textContent = ".feat-group{display:flex;flex-direction:column;gap:8px;margin:0 0 16px}.feat-group__title{font:600 13px/1.3 var(--font,inherit);color:var(--text-sub);letter-spacing:.02em}.feat-group__count{font-weight:500;opacity:.8}.sheet-chip.is-blocked{opacity:.45;cursor:not-allowed}[data-overlay] .modal,[data-overlay] [data-modal-root]{overflow-x:hidden}";
    document.head.appendChild(st);
  }
  renderFeaturesScene();

  /* step8: class resource spend dialogs + optional table rules */
  (function bootResources() {
    const MASTER_DEFAULTS = {
      dmg_disarm: false, dmg_mark: false, dmg_overrun: false, dmg_tumble: false,
      dmg_shove_aside: false, dmg_climb_bigger: false, xge_identify_spell: false,
      dmg_falling: false, dmg_adamantine_weapon: false, xge_no_long_rest: false,
      dmg_cleave: false, dmg_massive_damage: false, dmg_lingering_injuries: false,
      dmg_morale: false, dmg_hero_points: false, dmg_epic_heroism: false,
      dmg_proficiency_dice: false, gritty_rest: false
    };
    const MASTER_BTN = {
      disarm: "dmg_disarm", mark: "dmg_mark", overrun: "dmg_overrun", tumble: "dmg_tumble",
      "climb-bigger": "dmg_climb_bigger", "identify-spell": "xge_identify_spell",
      falling: "dmg_falling", "no-long-rest": "xge_no_long_rest", cleave: "dmg_cleave",
      "massive-damage": "dmg_massive_damage", lingering: "dmg_lingering_injuries",
      morale: "dmg_morale", "hero-point": "dmg_hero_points", "prof-die": "dmg_proficiency_dice"
    };
    const TCE_STYLES = [
      { id: "blind_fighting", name_ru: "Сражение вслепую", tce: true, paladin: true,
        summary_ru: "Слепое зрение 10 фт. Видишь в 10 фт даже ослеплённым или в темноте; невидимое — если оно не спряталось." },
      { id: "interception", name_ru: "Перехват", tce: true, paladin: true,
        summary_ru: "Реакция, когда союзник в 5 фт (не ты) получил попадание; в руках щит или простое/воинское оружие — снизить урон на 1к10+БМ (не ниже 0)." },
      { id: "blessed_warrior", name_ru: "Благословенный воин", tce: true, paladin: true,
        summary_ru: "Два заговора жреца как заклинания паладина (Хар.), вне лимита. При новом уровне паладина можно заменить один." }
    ];
    const SYSTEM_SHOCK = [
      { min: 1, max: 1, name_ru: "Падение до 0 хитов", effect_ru: "Существо опускается до 0 хитов." },
      { min: 2, max: 3, name_ru: "Падение до 0, стабильно", effect_ru: "Существо опускается до 0 хитов, но стабильно." },
      { min: 4, max: 5, name_ru: "Ошеломление", effect_ru: "Существо ошеломлено до конца своего следующего хода." },
      { min: 6, max: 7, name_ru: "Без реакций и с помехой", effect_ru: "Существо не может совершать реакции и совершает броски атаки и проверки характеристик с помехой до конца своего следующего хода." },
      { min: 8, max: 10, name_ru: "Без реакций", effect_ru: "Существо не может совершать реакции до конца своего следующего хода." }
    ];
    const LINGERING = [
      { min: 1, max: 1, name_ru: "Потеря глаза", effect_ru: "Помеха на проверки Мудрости (Внимательность), полагающиеся на зрение, и на броски дальнобойных атак. Заклинание вроде «Регенерация» восстанавливает глаз. Если глаз не осталось — ты ослеплён." },
      { min: 2, max: 2, name_ru: "Потеря руки или кисти", effect_ru: "Ты больше не можешь держать ничего двумя руками и можешь держать только один предмет за раз. Заклинание вроде «Регенерация» восстанавливает конечность." },
      { min: 3, max: 3, name_ru: "Потеря ступни или ноги", effect_ru: "Скорость пешком уменьшена вдвое; нужна трость, костыль или протез. После действия «Рывок» ты падаешь ничком. Помеха на проверки Ловкости для баланса. «Регенерация» восстанавливает конечность." },
      { min: 4, max: 4, name_ru: "Хромота", effect_ru: "Скорость пешком −5 футов. После «Рывка» — спасбросок Ловкости Сл 10, при провале падаешь ничком. Магическое лечение восстанавливает ногу." },
      { min: 5, max: 7, name_ru: "Внутренняя травма", effect_ru: "Всякий раз, когда ты пытаешься совершить действие в бою, соверши спасбросок Телосложения Сл 15. При провале теряешь действие и не можешь использовать реакции до начала своего следующего хода. Лечится магией или десятью днями полного отдыха." },
      { min: 8, max: 10, name_ru: "Сломанные рёбра", effect_ru: "Как «Внутренняя травма», но Сл спасброска 10. Лечится магией или десятью днями полного отдыха." },
      { min: 11, max: 13, name_ru: "Ужасный шрам", effect_ru: "Обезображивание трудно скрыть. Помеха на проверки Харизмы (Убеждение) и преимущество на проверки Харизмы (Запугивание). Лечение 6 круга и выше («Исцеление», «Регенерация») снимает шрам." },
      { min: 14, max: 16, name_ru: "Гноящаяся рана", effect_ru: "Максимум хитов −1 каждые 24 часа, пока рана есть; при максимуме 0 — смерть. Лечится магией или уходом: проверка Мудрости (Медицина) Сл 15 раз в сутки; после десяти успехов рана затягивается." },
      { min: 17, max: 20, name_ru: "Незначительный шрам", effect_ru: "Шрам без штрафов. Лечение 6 круга и выше («Исцеление», «Регенерация») снимает шрам." }
    ];
    const MORALE_HINTS = [
      { id: "surprised", label: "Существо застигнуто врасплох" },
      { id: "half_hp", label: "Впервые в бою ≤ половины хитов" },
      { id: "no_harm", label: "Нет способа навредить противнику в свой ход" },
      { id: "group_surprised", label: "Вся группа застигнута врасплох" },
      { id: "leader_down", label: "Вожак убит, недееспособен, пленён или вне боя" },
      { id: "half_group", label: "Группа сократилась вдвое без потерь у противника" }
    ];
    const KI_OPTS = [
      { id: "flurry_of_blows", name_ru: "Шквал ударов", cost: 1, summary_ru: "Сразу после действия «Атака» бонусным действием два безоружных удара." },
      { id: "patient_defense", name_ru: "Терпеливая оборона", cost: 1, summary_ru: "Бонусным действием принять действие «Уклонение»." },
      { id: "step_of_the_wind", name_ru: "Шаг ветра", cost: 1, summary_ru: "Бонусным действием «Отход» или «Рывок»; дальность прыжка удваивается на этот ход." }
    ];
    const META_OPTS = [
      { id: "careful", name_ru: "Осторожное заклинание", cost: 1, cost_ru: "1", summary_ru: "До модификатора Харизмы существ (мин. 1) автоматически преуспевают в спасе твоего заклинания." },
      { id: "distant", name_ru: "Далёкое заклинание", cost: 1, cost_ru: "1", summary_ru: "Удваивает дистанцию или даёт касанию дистанцию 30 фт." },
      { id: "empowered", name_ru: "Усиленное заклинание", cost: 1, cost_ru: "1", summary_ru: "Перебрось до модификатора Харизмы костей урона (мин. 1)." },
      { id: "extended", name_ru: "Продлённое заклинание", cost: 1, cost_ru: "1", summary_ru: "Длительность 1 минута и дольше удваивается (макс. 24 часа)." },
      { id: "heightened", name_ru: "Возвышенное заклинание", cost: 3, cost_ru: "3", summary_ru: "Одно существо получает помеху на первый спас этого заклинания." },
      { id: "quickened", name_ru: "Ускоренное заклинание", cost: 2, cost_ru: "2", summary_ru: "Время каста «1 действие» становится бонусным действием." },
      { id: "subtle", name_ru: "Незаметное заклинание", cost: 1, cost_ru: "1", summary_ru: "Кастуешь без вербального и соматического компонентов." },
      { id: "twinned", name_ru: "Удвоенное заклинание", cost: 0, cost_ru: "уровень ячейки (мин. 1)", summary_ru: "Заклинание с одной целью действует на второе существо в дистанции. Стоимость равна кругу ячейки." }
    ];
    const FLEX_COST = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };
    const CLERIC_CANTRIP_NAMES = {
      "sacred-flame": "Священное пламя", guidance: "Наставление", thaumaturgy: "Чудотворство",
      light: "Свет", "spare-the-dying": "Уход за умирающим", "word-of-radiance": "Слово сияния",
      "toll-the-dead": "Погребальный звон", mending: "Починка"
    };
    const DRUID_CANTRIP_NAMES = {
      "shillelagh": "Дубинка", "druidcraft": "Искусство друида", "produce-flame": "Сотворение пламени",
      "thorn-whip": "Терновый кнут", guidance: "Наставление", mending: "Починка"
    };

    function ty(s) { return typographyToTy(String(s || "")); }
    function foes() {
      const list = (typeof SESSION_TARGETS !== "undefined" ? SESSION_TARGETS : []).filter(function (t) { return t.kind === "enemy"; });
      return list.length ? list : [
        { id: "goblin", name: "Гоблин", kind: "enemy", ac: 15 },
        { id: "wolf", name: "Волк", kind: "enemy", ac: 13 },
        { id: "ogre", name: "Огр", kind: "enemy", ac: 11 }
      ];
    }
    function allies() {
      const list = (typeof SESSION_TARGETS !== "undefined" ? SESSION_TARGETS : []).filter(function (t) { return t.kind !== "enemy"; });
      return list.length ? list : [{ id: "elara", name: "Элара", kind: "ally" }];
    }
    function targetById(id) {
      return foes().concat(allies()).find(function (t) { return t.id === id; }) || foes()[0];
    }
    function pb() {
      const lv = sheet.level || 1;
      if (lv >= 17) return 6;
      if (lv >= 13) return 5;
      if (lv >= 9) return 4;
      if (lv >= 5) return 3;
      return 2;
    }
    function skillMod(key) {
      if (typeof skillTotal === "function") return skillTotal(key);
      const map = { athletics: "str", acrobatics: "dex", arcana: "int", medicine: "wis", insight: "wis" };
      const abil = map[key] || "str";
      const mod = (typeof abilityModOf === "function" && typeof scoreTotal === "function") ? abilityModOf(scoreTotal(abil, true)) : 0;
      const prof = (sheet.skills && sheet.skills[key] && (sheet.skills[key].is_proficient || sheet.skills[key].prof)) ? pb() : 0;
      return mod + prof;
    }
    function diceOnTable() { return typeof isDiceOnTable === "function" ? isDiceOnTable() : false; }
    function rollDie(sides) { return 1 + Math.floor(Math.random() * sides); }
    function lookupTable(table, n, lo, hi) {
      const v = Math.max(lo, Math.min(hi, Math.floor(n)));
      return table.find(function (r) { return v >= r.min && v <= r.max; }) || table[table.length - 1];
    }
    function heroMax(level) {
      const lv = Math.max(1, Math.min(20, Math.floor(Number(level) || 1)));
      return lv <= 1 ? 5 : 5 + Math.floor(lv / 2);
    }
    function profDieSides(bonus) {
      const p = Math.max(0, Math.floor(Number(bonus) || 0));
      if (p <= 1) return null;
      if (p === 2) return 4;
      if (p === 3) return 6;
      if (p === 4) return 8;
      if (p === 5) return 10;
      if (p >= 6) return 12;
      return null;
    }
    function fallingDice(feet) { return Math.min(20, Math.floor(Math.max(0, Math.floor(Number(feet) || 0)) / 10)); }
    function noLongRestDc(days) { return 10 + Math.max(0, Math.floor(Number(days) || 0)) * 5; }
    function harnessCap(bonus) { return Math.max(1, Math.ceil(Math.max(1, bonus) / 2)); }
    function harnessDaily(slug, level) {
      const lv = Number(level) || 1;
      if (slug === "cleric") { if (lv >= 18) return 3; if (lv >= 6) return 2; if (lv >= 2) return 1; }
      if (slug === "paladin") { if (lv >= 15) return 3; if (lv >= 7) return 2; if (lv >= 3) return 1; }
      return 0;
    }
    function wizardCantrips() {
      return ((typeof CAT !== "undefined" && CAT.wizardSpells) ? CAT.wizardSpells : []).filter(function (s) { return (s.level || 0) === 0; });
    }
    function knownWizardCantrips() {
      const r = ensureRules();
      if (!r.wizardCantrips || !r.wizardCantrips.length) {
        const all = wizardCantrips();
        const prefer = ["fire_bolt", "mage_hand", "minor_illusion", "prestidigitation", "light", "ray_of_frost", "shocking_grasp"];
        const have = prefer.map(function (id) { return all.find(function (s) { return s.slug === id; }); }).filter(Boolean);
        r.wizardCantrips = (have.length ? have : all.slice(0, 5)).map(function (s) { return s.slug; });
      }
      return r.wizardCantrips;
    }
    function clericCantripsKnown() {
      const r = ensureRules();
      if (!r.clericCantrips || !r.clericCantrips.length) r.clericCantrips = ["sacred-flame", "guidance", "thaumaturgy", "light"];
      return r.clericCantrips;
    }
    function ensureRules() {
      if (!sheet.rules) {
        sheet.rules = {
          tceAllowed: null,
          master: Object.assign({}, MASTER_DEFAULTS),
          hero: { cur: 0, max: 0 },
          noLongRestDays: 0,
          cantripSwapUsed: false,
          harness: { cur: 0, max: 0 },
          lingering: null,
          draft: {},
          wizardCantrips: null,
          clericCantrips: null,
          druidCantrips: null,
          result: ""
        };
      }
      const r = sheet.rules;
      if (!r.master) r.master = Object.assign({}, MASTER_DEFAULTS);
      Object.keys(MASTER_DEFAULTS).forEach(function (k) { if (r.master[k] == null) r.master[k] = MASTER_DEFAULTS[k]; });
      if (!r.hero) r.hero = { cur: 0, max: 0 };
      if (!r.harness) r.harness = { cur: 0, max: 0 };
      if (!r.draft) r.draft = {};
      if (r.tceAllowed === undefined) r.tceAllowed = null;
      return r;
    }
    function tceAllowedVal() { return ensureRules().tceAllowed; }
    function tceFeaturesOn() { return tceAllowedVal() !== false; }
    function masterFlag(key) { return !!ensureRules().master[key]; }
    function optionalBadge(f) {
      if (!f || !f.optional) return "";
      const label = (f.source_book === "tcoe") ? "TCE · опционально" : "опционально";
      return "<span class=\"src-tag is-optional\">" + esc(label) + "</span>";
    }
    function syncHarnessPool() {
      const r = ensureRules();
      const slug = classSlug();
      const lv = (mainClass().level || sheet.level || 1);
      const max = tceFeaturesOn() ? harnessDaily(slug, lv) : 0;
      if (r.harness.max !== max) {
        r.harness.max = max;
        if (r.harness.cur == null || r.harness.cur > max) r.harness.cur = max;
      }
      if (r.harness.cur == null) r.harness.cur = max;
    }
    function syncHeroPool() {
      const r = ensureRules();
      if (!masterFlag("dmg_hero_points")) return;
      const max = heroMax(sheet.level || 1);
      if (!r.hero.inited || r.hero.max !== max) {
        r.hero.max = max;
        if (!r.hero.inited) { r.hero.cur = max; r.hero.inited = true; }
        if (r.hero.cur > max) r.hero.cur = max;
      }
    }
    function restVariant() {
      const r = ensureRules();
      if (r.master.dmg_epic_heroism && !r.master.gritty_rest) return "epic";
      if (r.master.gritty_rest && !r.master.dmg_epic_heroism) return "gritty";
      if (r.master.dmg_epic_heroism && r.master.gritty_rest) return "epic";
      return "normal";
    }
    function restLabels() {
      const v = restVariant();
      if (v === "gritty") return { chipShort: "Короткий (8 ч)", chipLong: "Продолжительный (7 дн.)" };
      if (v === "epic") return { chipShort: "Короткий (5 мин)", chipLong: "Продолжительный (1 ч)" };
      return { chipShort: "Короткий отдых", chipLong: "Продолжительный отдых" };
    }
    function foot(primary, act, opts) {
      opts = opts || {};
      const dis = opts.disabled ? " disabled" : "";
      return "<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-close>" + esc(opts.secondary || "Отмена") + "</button>" +
        (primary ? "<button type=\"button\" class=\"btn primary\" data-res-act=\"" + esc(act) + "\"" + dis + ">" + esc(primary) + "</button>" : "") + "</div>";
    }
    function fieldNum(label, key, val, placeholder) {
      return "<label>" + esc(label) + "<input type=\"number\" data-res-input=\"" + esc(key) + "\" value=\"" + esc(val == null ? "" : val) + "\" placeholder=\"" + esc(placeholder || "") + "\"></label>";
    }
    function fieldText(label, key, val, placeholder) {
      return "<label>" + esc(label) + "<input data-res-input=\"" + esc(key) + "\" value=\"" + esc(val || "") + "\" placeholder=\"" + esc(placeholder || "") + "\"></label>";
    }
    function chipsTargets(selected, attr) {
      return "<div class=\"pad-row\" style=\"flex-wrap:wrap\">" + foes().map(function (f) {
        return "<button type=\"button\" class=\"sheet-chip" + (selected === f.id ? " is-on" : "") + "\" data-res-act=\"" + attr + "\" data-v=\"" + esc(f.id) + "\">" + esc(f.name) + (f.ac ? " · КД " + f.ac : "") + "</button>";
      }).join("") + "</div>";
    }
    function draft() { return ensureRules().draft; }
    function setDraft(k, v) { ensureRules().draft[k] = v; }
    function resultLine() {
      const r = ensureRules().result;
      return r ? "<p class=\"pad-note\">" + ty(esc(r)) + "</p>" : "";
    }

    function renderDisarm() {
      const d = draft();
      if (!d.disarmTarget) d.disarmTarget = (foes()[0] || {}).id;
      const two = !!d.disarmTwoHand;
      const bigger = !!d.disarmBigger;
      const smaller = !!d.disarmSmaller;
      return "<p>Тратит одну атаку. Успех — цель роняет предмет, <strong>урона нет</strong>. Помеха, если предмет в двух руках; цель с преимуществом, если больше атакующего.</p>" +
        "<p class=\"section-label\">Цель</p>" + chipsTargets(d.disarmTarget, "disarm-target") +
        fieldText("Предмет", "disarmItem", d.disarmItem || "оружие", "предмет") +
        "<label class=\"row-check\" style=\"display:flex;gap:8px;align-items:center;margin:8px 0\"><input type=\"checkbox\" data-res-check=\"disarmTwoHand\"" + (two ? " checked" : "") + "> Предмет в двух руках (помеха атакующему)</label>" +
        "<label class=\"row-check\" style=\"display:flex;gap:8px;align-items:center;margin:8px 0\"><input type=\"checkbox\" data-res-check=\"disarmBigger\"" + (bigger ? " checked" : "") + "> Цель больше атакующего (преимущество цели)</label>" +
        "<label class=\"row-check\" style=\"display:flex;gap:8px;align-items:center;margin:8px 0\"><input type=\"checkbox\" data-res-check=\"disarmSmaller\"" + (smaller ? " checked" : "") + "> Цель меньше атакующего (помеха цели)</label>" +
        (diceOnTable()
          ? fieldNum("Сумма броска атаки", "disarmAtk", d.disarmAtk, "Введи результат броска атаки") + fieldNum("Проверка цели (Атлетика или Акробатика)", "disarmDef", d.disarmDef, "Сумма цели")
          : "<p class=\"pad-note\">Броски будут сделаны автоматически (атака 1к20+" + ((typeof pb === "function" ? pb() : 3) + (typeof abilityModOf === "function" && typeof scoreTotal === "function" ? abilityModOf(scoreTotal("str", true)) : 4)) + " против проверки цели).</p>") +
        resultLine() + foot("Провести", "disarm-go");
    }
    function renderMark() {
      const d = draft();
      if (!d.markTarget) d.markTarget = (foes()[0] || {}).id;
      return "<p>Пометь цель рукопашной атаки. До конца твоего следующего хода провоцированные атаки по ней — с преимуществом и без траты реакции (не больше одной в ход).</p>" +
        "<p class=\"section-label\">Цель</p>" + chipsTargets(d.markTarget, "mark-target") +
        resultLine() + foot("Пометить", "mark-go");
    }
    function renderOverrunTumble(kind) {
      const isOver = kind === "overrun";
      const d = draft();
      const keyT = isOver ? "overTarget" : "tumbleTarget";
      const keyAct = isOver ? "overAct" : "tumbleAct";
      if (!d[keyT]) d[keyT] = (foes()[0] || {}).id;
      if (!d[keyAct]) d[keyAct] = "action";
      const skill = isOver ? "athletics" : "acrobatics";
      const skillRu = isOver ? "Атлетика" : "Акробатика";
      const my = skillMod(skill);
      const size = d.overSize || "same";
      return "<p>Действием или бонусным. Успех — пометка в ленте о проходе сквозь пространство цели (без карты).</p>" +
        "<p class=\"section-label\">Отметка</p><div class=\"pad-row\">" +
        "<button type=\"button\" class=\"sheet-chip" + (d[keyAct] === "action" ? " is-on" : "") + "\" data-res-act=\"" + kind + "-act\" data-v=\"action\">Действие</button>" +
        "<button type=\"button\" class=\"sheet-chip" + (d[keyAct] === "bonus" ? " is-on" : "") + "\" data-res-act=\"" + kind + "-act\" data-v=\"bonus\">Бонусное</button></div>" +
        "<p class=\"section-label\">Цель</p>" + chipsTargets(d[keyT], kind + "-target") +
        (isOver ? ("<div class=\"pad-row\" style=\"margin-top:8px\">" +
          "<button type=\"button\" class=\"sheet-chip" + (size === "bigger" ? " is-on" : "") + "\" data-res-act=\"over-size\" data-v=\"bigger\">Ты крупнее цели (преимущество)</button>" +
          "<button type=\"button\" class=\"sheet-chip" + (size === "smaller" ? " is-on" : "") + "\" data-res-act=\"over-size\" data-v=\"smaller\">Ты меньше цели (помеха)</button>" +
          "<button type=\"button\" class=\"sheet-chip" + (size === "same" ? " is-on" : "") + "\" data-res-act=\"over-size\" data-v=\"same\">Одинаковый размер</button></div>") : "") +
        (diceOnTable()
          ? fieldNum("Твоя проверка (мод. " + (my >= 0 ? "+" : "") + my + ")", kind + "Mine", d[kind + "Mine"], "Введи результат " + skillRu) + fieldNum("Состязание цели (" + skillRu + ")", kind + "Theirs", d[kind + "Theirs"], "Введи результат состязания цели")
          : "<p class=\"pad-note\">Броски будут сделаны автоматически (1к20" + (my >= 0 ? "+" : "") + my + " против " + skillRu + " цели).</p>") +
        resultLine() + foot("Провести", kind + "-go");
    }
    function renderClimbBigger() {
      const d = draft();
      if (!d.climbTarget) d.climbTarget = (foes()[0] || {}).id;
      const mode = d.climbMode || "climb";
      const skill = d.climbSkill || "athletics";
      const my = skillMod(skill);
      return "<p>Меньшее существо действием: Атлетика или Акробатика против Акробатики цели. Успех — «на существе», атаки по нему с преимуществом, перемещается вместе с ним. Большее действием может сбросить.</p>" +
        "<div class=\"pad-row\"><button type=\"button\" class=\"sheet-chip" + (mode === "climb" ? " is-on" : "") + "\" data-res-act=\"climb-mode\" data-v=\"climb\">Взбираться</button>" +
        "<button type=\"button\" class=\"sheet-chip" + (mode === "shake" ? " is-on" : "") + "\" data-res-act=\"climb-mode\" data-v=\"shake\">Сбросить</button></div>" +
        "<p class=\"section-label\">Цель</p>" + chipsTargets(d.climbTarget, "climb-target") +
        (mode === "climb" ? ("<div class=\"pad-row\" style=\"margin-top:8px\"><button type=\"button\" class=\"sheet-chip" + (skill === "athletics" ? " is-on" : "") + "\" data-res-act=\"climb-skill\" data-v=\"athletics\">Атлетика</button>" +
          "<button type=\"button\" class=\"sheet-chip" + (skill === "acrobatics" ? " is-on" : "") + "\" data-res-act=\"climb-skill\" data-v=\"acrobatics\">Акробатика</button></div>") : "") +
        (diceOnTable()
          ? fieldNum("Твоя проверка (мод. " + (my >= 0 ? "+" : "") + my + ")", "climbMine", d.climbMine, "Введи результат своей проверки") + fieldNum("Состязание цели", "climbTheirs", d.climbTheirs, "Введи результат состязания")
          : "<p class=\"pad-note\">Броски будут сделаны автоматически.</p>") +
        resultLine() + foot(mode === "shake" ? "Сбросить" : "Взбираться", "climb-go");
    }
    function renderIdentifySpell() {
      const d = draft();
      const lv = d.identLevel == null ? 3 : d.identLevel;
      const dc = 15 + Math.max(0, Math.min(9, Math.floor(Number(lv) || 0)));
      const mod = skillMod("arcana");
      return "<p>Реакция. Проверка Магии (Анализ) Сл 15 + уровень заклинания.</p>" +
        fieldNum("Круг заклинания", "identLevel", lv, "") +
        fieldText("Имя заклинания (необязательно)", "identName", d.identName || "", "заклинание") +
        "<p class=\"pad-note\">Сл = " + dc + ".</p>" +
        (diceOnTable()
          ? fieldNum("Анализ (мод. " + (mod >= 0 ? "+" : "") + mod + ")", "identTotal", d.identTotal, "Введи результат проверки Магии (Анализ)")
          : "<p class=\"pad-note\">Бросок будет сделан автоматически (1к20" + (mod >= 0 ? "+" : "") + mod + ").</p>") +
        resultLine() + foot("Проверить", "ident-go");
    }
    function renderFalling() {
      const d = draft();
      if (!d.fallWho) d.fallWho = "self";
      const feet = d.fallFeet == null ? 30 : d.fallFeet;
      const dice = fallingDice(feet);
      const formula = dice <= 0 ? "0" : (dice + "к6 дробящего");
      const whoBtns = "<div class=\"pad-row\" style=\"flex-wrap:wrap\"><button type=\"button\" class=\"sheet-chip" + (d.fallWho === "self" ? " is-on" : "") + "\" data-res-act=\"fall-who\" data-v=\"self\">Себе</button>" +
        foes().map(function (t) { return "<button type=\"button\" class=\"sheet-chip" + (d.fallWho === t.id ? " is-on" : "") + "\" data-res-act=\"fall-who\" data-v=\"" + esc(t.id) + "\">" + esc(t.name) + "</button>"; }).join("") + "</div>";
      return "<p>Формула: " + formula + (dice > 0 ? ". При уроне больше 0 — состояние «Опрокинутый»." : ".") + "</p>" +
        fieldNum("Высота, фт", "fallFeet", feet, "") +
        "<p class=\"section-label\">Кто падает</p>" + whoBtns +
        (diceOnTable() ? fieldNum("Сумма урона", "fallDmg", d.fallDmg, "Введи сумму урона от падения") : "") +
        resultLine() + foot("Применить", "fall-go");
    }
    function renderNoLongRest() {
      const r = ensureRules();
      const d = draft();
      const days = r.noLongRestDays || 0;
      const dc = noLongRestDc(days);
      const con = (typeof abilityModOf === "function" && typeof scoreTotal === "function") ? abilityModOf(scoreTotal("con", true)) : 2;
      return "<p>Спасбросок Телосложения Сл " + dc + ". При провале +1 степень истощения. Продолжительный отдых сбрасывает счётчик суток.</p>" +
        "<p class=\"pad-note\">Уже учтено суток: " + days + " · сейчас истощение " + (sheet.exhaustion || 0) + ".</p>" +
        (diceOnTable() ? fieldNum("Спасбросок Телосложения (мод. " + (con >= 0 ? "+" : "") + con + ")", "nlrTotal", d.nlrTotal, "Введи результат спасброска Телосложения") : "<p class=\"pad-note\">Бросок будет сделан автоматически (1к20" + (con >= 0 ? "+" : "") + con + ").</p>") +
        resultLine() + foot("Спасбросок", "nlr-go");
    }

    function renderCleave() {
      const d = draft();
      if (!d.cleaveTarget) d.cleaveTarget = (foes()[1] || foes()[0] || {}).id;
      if (d.cleaveOverflow == null) d.cleaveOverflow = 6;
      if (d.cleaveAtk == null) d.cleaveAtk = 18;
      const t = targetById(d.cleaveTarget);
      const ac = t && t.ac;
      const would = ac != null && d.cleaveAtk != null ? (Number(d.cleaveAtk) >= ac) : null;
      return "<p>Если рукопашная атака оружием опустила существо до 0 хитов и остался урон — можно перенести остаток на другое существо в 5 фт, если исходный бросок атаки попал бы по нему. Новая атака не тратится.</p>" +
        fieldNum("Остаток урона", "cleaveOverflow", d.cleaveOverflow, "") +
        fieldNum("Исходный бросок атаки", "cleaveAtk", d.cleaveAtk, "") +
        "<p class=\"section-label\">Вторая цель</p>" + chipsTargets(d.cleaveTarget, "cleave-target") +
        (ac != null ? "<p class=\"pad-note\">" + esc(t.name) + " · КД " + ac + (would == null ? "" : (would ? " · бросок попал бы" : " · бросок не попал бы")) + ".</p>" : "<p class=\"pad-note\">Подтверди цель вручную (бросок атаки неизвестен).</p>") +
        resultLine() +
        "<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-res-act=\"cleave-skip\">Пропустить</button><button type=\"button\" class=\"btn primary\" data-res-act=\"cleave-go\">Перенести остаток</button></div>";
    }
    function renderMassive() {
      const d = draft();
      const hpMax = sheet.hpMax || 0;
      const threshold = Math.ceil(hpMax / 2);
      if (d.massDmg == null) d.massDmg = threshold;
      const phase = d.massPhase || "save";
      const qualifies = Number(d.massDmg) >= threshold && hpMax > 0;
      const who = d.massWho || "self";
      const label = who === "self" ? (sheet.name || "ты") : (targetById(who) || {}).name;
      let body = "<p>Урон из одного источника не меньше половины максимума хитов — спасбросок Телосложения Сл 15, иначе эффект из таблицы «Системный шок».</p>" +
        fieldNum("Урон", "massDmg", d.massDmg, "") +
        "<p class=\"pad-note\">Порог: половина макс. " + threshold + " из " + hpMax + (qualifies ? "." : ". Порог не достигнут — окно справочное.") + "</p>" +
        "<p class=\"section-label\">Цель</p><div class=\"pad-row\" style=\"flex-wrap:wrap\"><button type=\"button\" class=\"sheet-chip" + (who === "self" ? " is-on" : "") + "\" data-res-act=\"mass-who\" data-v=\"self\">Себе</button>" +
        foes().map(function (t) { return "<button type=\"button\" class=\"sheet-chip" + (who === t.id ? " is-on" : "") + "\" data-res-act=\"mass-who\" data-v=\"" + esc(t.id) + "\">" + esc(t.name) + "</button>"; }).join("") + "</div>";
      if (phase === "save") {
        const con = (typeof abilityModOf === "function" && typeof scoreTotal === "function") ? abilityModOf(scoreTotal("con", true)) : 2;
        body += diceOnTable()
          ? fieldNum("Результат спаса (с кубиков)", "massSave", d.massSave, "Введи результат спасброска Телосложения")
          : "<p class=\"pad-note\">Спасбросок Телосложения Сл 15 (1к20" + (con >= 0 ? "+" : "") + con + ").</p>";
        body += resultLine() + foot("Спасбросок Тел", "mass-save");
      } else if (phase === "shock") {
        body += "<p class=\"section-label\">Таблица «Системный шок» (к10)</p><ul>" + SYSTEM_SHOCK.map(function (r) {
          return "<li><b class=\"num\">" + (r.min === r.max ? r.min : (r.min + "–" + r.max)) + "</b> — " + esc(r.name_ru) + ". " + esc(ty(r.effect_ru)) + "</li>";
        }).join("") + "</ul>" +
          (diceOnTable() ? fieldNum("к10 (с кубиков)", "massShock", d.massShock, "Введи к10 системного шока") : "") +
          resultLine() + foot("Бросок шока", "mass-shock");
      } else {
        body += resultLine() + "<div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Готово</button></div>";
      }
      return body;
    }
    function renderLingering() {
      const d = draft();
      const reason = d.lingReason || "crit";
      const reasons = [
        { id: "crit", label: "Критический удар" },
        { id: "zero", label: "Падение до 0 хитов" },
        { id: "shock", label: "Провал спаса массивного урона" }
      ];
      return "<p>Бросок по таблице незаживающих ран при критическом ударе, при падении до 0 хитов или при провале спаса массивного урона (если тот включён).</p>" +
        "<p class=\"section-label\">Повод</p><div class=\"pad-row\" style=\"flex-wrap:wrap\">" + reasons.map(function (r) {
          return "<button type=\"button\" class=\"sheet-chip" + (reason === r.id ? " is-on" : "") + "\" data-res-act=\"ling-reason\" data-v=\"" + r.id + "\">" + esc(r.label) + "</button>";
        }).join("") + "</div>" +
        "<p class=\"section-label\">Таблица (к20)</p><ul style=\"max-height:180px;overflow:auto\">" + LINGERING.map(function (r) {
          return "<li><b class=\"num\">" + (r.min === r.max ? r.min : (r.min + "–" + r.max)) + "</b> — " + esc(r.name_ru) + ". " + esc(ty(r.effect_ru)) + "</li>";
        }).join("") + "</ul>" +
        (diceOnTable() ? fieldNum("к20 (с кубиков)", "lingRoll", d.lingRoll, "Введи к20") : "") +
        resultLine() + foot("Бросок к20", "ling-go");
    }
    function renderMorale() {
      const d = draft();
      if (!d.moraleWho) d.moraleWho = {};
      const hints = d.moraleHints || {};
      const over = !!d.moraleOver;
      const surr = !!d.moraleSurrender;
      return "<p>Только враги и НПС. Спасбросок Мудрости Сл 10. Провал — бежит (или сдаётся, если отмечено). Игроков этим правилом не гоняет.</p>" +
        "<p class=\"section-label\">Поводы (подсказки, не определяются сами)</p>" +
        MORALE_HINTS.map(function (h) {
          return "<label class=\"row-check\" style=\"display:flex;gap:8px;align-items:center;margin:4px 0\"><input type=\"checkbox\" data-res-check=\"mh:" + h.id + "\"" + (hints[h.id] ? " checked" : "") + "> " + esc(h.label) + "</label>";
        }).join("") +
        "<label class=\"row-check\" style=\"display:flex;gap:8px;align-items:center;margin:8px 0\"><input type=\"checkbox\" data-res-check=\"moraleOver\"" + (over ? " checked" : "") + "> Подавляющее превосходство (автопровал / как помеха по решению мастера)</label>" +
        "<label class=\"row-check\" style=\"display:flex;gap:8px;align-items:center;margin:4px 0\"><input type=\"checkbox\" data-res-check=\"moraleSurrender\"" + (surr ? " checked" : "") + "> При провале — «сдаётся», а не «бежит»</label>" +
        "<p class=\"section-label\">Враги</p>" + foes().map(function (t) {
          return "<label class=\"row-check\" style=\"display:flex;gap:8px;align-items:center;margin:4px 0\"><input type=\"checkbox\" data-res-check=\"mw:" + t.id + "\"" + (d.moraleWho[t.id] ? " checked" : "") + "> " + esc(t.name) + "</label>";
        }).join("") +
        (diceOnTable() ? fieldNum("Спас Мудрости", "moraleSave", d.moraleSave, "Введи результат спаса Мудрости") : "<p class=\"pad-note\">Бросок будет сделан автоматически (Сл 10).</p>") +
        resultLine() + foot("Спас Мудрости", "morale-go");
    }
    function renderHeroPoint() {
      syncHeroPool();
      const r = ensureRules();
      const left = r.hero.cur || 0;
      return "<p>На 1 уровне — 5 очков. При повышении уровня остаток сгорает, новый запас = 5 + половина уровня (вниз). Трата: после броска к20 до исхода — +1к6; либо автоматически стабилизировать умирающего или успех на спасброске от смерти.</p>" +
        "<p class=\"pad-note\">Сейчас " + left + "/" + (r.hero.max || 0) + ".</p>" +
        (left <= 0 ? "<p>Нет очков героя.</p>" : "") +
        (diceOnTable() ? fieldNum("к6", "heroD6", draft().heroD6, "Введи к6") : "") +
        resultLine() +
        "<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-close>Отмена</button>" +
        "<button type=\"button\" class=\"btn\" data-res-act=\"hero-stab\"" + (left <= 0 ? " disabled" : "") + ">Стабилизировать</button>" +
        "<button type=\"button\" class=\"btn\" data-res-act=\"hero-death\"" + (left <= 0 ? " disabled" : "") + ">Успех на спасброске от смерти</button>" +
        "<button type=\"button\" class=\"btn primary\" data-res-act=\"hero-d6\"" + (left <= 0 ? " disabled" : "") + ">+1к6 к к20</button></div>";
    }
    function renderProfDie() {
      const sides = profDieSides(pb());
      const d = draft();
      return "<p>Вместо фиксированного бонуса мастерства к атаке, проверке и спасброску бросается кость. Числовые Сл и «половина БМ» остаются числом.</p>" +
        "<p class=\"pad-note\">Сейчас БМ +" + pb() + (sides ? " → кость к" + sides + "." : ".") + "</p>" +
        (diceOnTable() && sides ? fieldNum("к" + sides + " (с кубиков)", "profRoll", d.profRoll, "") : "") +
        resultLine() + foot(sides ? "Подставить" : "Закрыть", sides ? "prof-go" : "", { secondary: "Закрыть" });
    }
    function renderOpportunityFull() {
      const d = draft();
      if (!d.oaTrigger) d.oaTrigger = "leave";
      if (!d.oaTarget) d.oaTarget = (foes()[0] || {}).id;
      const feats = (ensureAbilState().feats || []);
      function hasFeat(slug) { return feats.some(function (f) { return f === slug || (f && f.slug === slug); }); }
      const hasSentinel = hasFeat("sentinel");
      const hasWarCaster = hasFeat("war_caster");
      const dis = !!d.oaDisengaged;
      const leaveBlocked = d.oaTrigger === "leave" && dis && !hasSentinel;
      const enterBlocked = d.oaTrigger === "enter" && dis;
      return "<p>Без карты: подтверди триггер и цель. Тратит реакцию.</p>" +
        "<p class=\"section-label\">Триггер</p><div class=\"pad-row\">" +
        "<button type=\"button\" class=\"sheet-chip" + (d.oaTrigger === "leave" ? " is-on" : "") + "\" data-res-act=\"oa-trigger\" data-v=\"leave\">Вышла из досягаемости</button>" +
        "<button type=\"button\" class=\"sheet-chip" + (d.oaTrigger === "enter" ? " is-on" : "") + "\" data-res-act=\"oa-trigger\" data-v=\"enter\">Вошла в досягаемость</button>" +
        "</div>" +
        "<p class=\"section-label\">Цель</p>" + chipsTargets(d.oaTarget, "oa-target") +
        fieldText("Имя существа (в ленту)", "oaName", d.oaName || "", "Имя существа") +
        "<label class=\"row-check\" style=\"display:flex;gap:8px;align-items:center;margin:8px 0\"><input type=\"checkbox\" data-res-check=\"oaDisengaged\"" + (dis ? " checked" : "") + "> Цель совершила Отход в этот ход</label>" +
        (leaveBlocked ? "<p class=\"pad-note\">Без черты «Страж» провокация на выход при Отходе недоступна.</p>" : "") +
        (enterBlocked ? "<p class=\"pad-note\">Отход снимает провокацию на вход (древковое).</p>" : "") +
        (hasSentinel && d.oaTrigger === "leave" ? "<p class=\"pad-note\">Страж: Отход не спасает от провокации на выход.</p>" : "") +
        (hasWarCaster ? ("<p class=\"section-label\">Режим</p><div class=\"pad-row\"><button type=\"button\" class=\"sheet-chip" + ((d.oaMode || "weapon") === "weapon" ? " is-on" : "") + "\" data-res-act=\"oa-mode\" data-v=\"weapon\">Оружием</button><button type=\"button\" class=\"sheet-chip" + (d.oaMode === "spell" ? " is-on" : "") + "\" data-res-act=\"oa-mode\" data-v=\"spell\">Заклинание</button></div>") : "") +
        resultLine() + foot("Атаковать", "oa-go", { disabled: leaveBlocked || enterBlocked });
    }
    function renderCounterspell() {
      const d = draft();
      if (d.csTargetLv == null) d.csTargetLv = 3;
      if (d.csSlot == null) d.csSlot = 3;
      const slots = sheet.slots || {};
      const slotChips = [3, 4, 5, 6, 7, 8, 9].map(function (lv) {
        const s = slots[lv];
        if (!s || !s.max) return "";
        return "<button type=\"button\" class=\"sheet-chip" + (Number(d.csSlot) === lv ? " is-on" : "") + "\" data-res-act=\"cs-slot\" data-v=\"" + lv + "\">" + lv + " ур. (" + s.cur + "/" + s.max + ")</button>";
      }).join("");
      const auto = Number(d.csSlot) > Number(d.csTargetLv);
      const dc = 10 + Math.max(0, Math.floor(Number(d.csTargetLv) || 0));
      const slug = classSlug();
      const abil = slug === "wizard" ? "int" : (slug === "paladin" ? "cha" : "wis");
      const bonus = (typeof abilityModOf === "function" && typeof scoreTotal === "function" ? abilityModOf(scoreTotal(abil, true)) : 4) + pb();
      return "<p>Реакция · ячейка 3 круга или выше. Если круг ячейки строго выше круга цели — успех без проверки.</p>" +
        fieldNum("Круг чужого заклинания", "csTargetLv", d.csTargetLv, "") +
        fieldText("Имя заклинания врага (необязательно)", "csName", d.csName || "", "") +
        "<p class=\"section-label\">Твоя ячейка</p><div class=\"pad-row\" style=\"flex-wrap:wrap\">" + (slotChips || "<p class=\"pad-note\">Нет ячеек 3 круга и выше.</p>") + "</div>" +
        (auto
          ? "<p class=\"pad-note\">Успех без проверки (ячейка " + d.csSlot + " > круг " + d.csTargetLv + ").</p>"
          : "<p class=\"pad-note\">Проверка характеристики заклинателя Сл " + dc + " · бонус " + (bonus >= 0 ? "+" : "") + bonus + ".</p>") +
        (diceOnTable() && !auto ? fieldNum("Результат проверки", "csCheck", d.csCheck, "") : "") +
        resultLine() + foot("Прервать", "cs-go", { disabled: !slots[d.csSlot] || slots[d.csSlot].cur <= 0 });
    }

    function renderKi() {
      const r = ensureRules();
      if (r.ki == null) r.ki = { cur: 0, max: 0 };
      if (classSlug() !== "monk") {
        return "<p>Трата ци — умение монаха 2 уровня и выше. У этого персонажа его нет.</p><div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Закрыть</button></div>";
      }
      return "<p>Сейчас " + r.ki.cur + "/" + r.ki.max + ". Выбери, на что потратить ци.</p>" +
        KI_OPTS.map(function (o) {
          return "<div class=\"ident-class-row\"><span><b>" + esc(o.name_ru) + "</b> · " + o.cost + " ци. " + esc(ty(o.summary_ru)) + "</span>" +
            "<button type=\"button\" class=\"btn\" data-res-act=\"ki-spend\" data-v=\"" + o.id + "\"" + (r.ki.cur < o.cost ? " disabled" : "") + ">−" + o.cost + "</button></div>";
        }).join("") +
        resultLine() + "<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-close>Закрыть</button></div>";
    }
    function renderSorcery() {
      if (classSlug() !== "sorcerer") {
        return "<p>Очки чародейства — умение чародея. У этого персонажа его нет.</p><div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Закрыть</button></div>";
      }
      const r = ensureRules();
      if (!r.sorcery) r.sorcery = { cur: 0, max: 0 };
      const left = r.sorcery.cur;
      const meta = META_OPTS.map(function (o) {
        const cost = o.cost || 1;
        return "<div class=\"ident-class-row\"><span><b>" + esc(o.name_ru) + "</b> · " + esc(o.cost_ru) + " очк. " + esc(ty(o.summary_ru)) + "</span>" +
          "<button type=\"button\" class=\"btn\" data-res-act=\"sorc-meta\" data-v=\"" + o.id + "\"" + (left < cost && o.id !== "twinned" ? " disabled" : "") + ">−" + (o.id === "twinned" ? "круг" : cost) + "</button></div>";
      }).join("");
      const make = [1, 2, 3, 4, 5].map(function (lv) {
        const cost = FLEX_COST[lv];
        return "<button type=\"button\" class=\"btn\" data-res-act=\"sorc-make\" data-v=\"" + lv + "\"" + (left < cost ? " disabled" : "") + ">Ячейка " + lv + " (−" + cost + ")</button>";
      }).join("");
      const eat = [1, 2, 3, 4, 5].map(function (lv) {
        const s = (sheet.slots || {})[lv];
        const free = s ? s.cur : 0;
        return "<button type=\"button\" class=\"btn\" data-res-act=\"sorc-eat\" data-v=\"" + lv + "\"" + (free <= 0 ? " disabled" : "") + ">" + lv + " ур. → +" + lv + " очк.</button>";
      }).join("");
      return "<p>Сейчас " + left + "/" + r.sorcery.max + ". Выбери метамагию или гибкое колдовство.</p>" +
        "<p class=\"section-label\">Метамагия</p>" + meta +
        "<p class=\"section-label\">Гибкое колдовство</p><p class=\"pad-note\">Очки создают новую ячейку до 5 круга, даже если круг полон. Она исчезает после продолжительного отдыха. Ячейка → очки (= уровень ячейки).</p>" +
        "<div class=\"pad-row\" style=\"flex-wrap:wrap\">" + make + "</div><div class=\"pad-row\" style=\"flex-wrap:wrap;margin-top:8px\">" + eat + "</div>" +
        resultLine() + "<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-close>Закрыть</button></div>";
    }
    function renderBardic() {
      return "<p>Бардовское вдохновение — умение барда. У этого персонажа его нет.</p><div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Закрыть</button></div>";
    }
    function renderSuperiority() {
      return "<p>Кости превосходства — умение Мастера боевых искусств или черты «Боевой адепт». У этого персонажа известных манёвров нет.</p><div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Закрыть</button></div>";
    }
    function renderPsionic() {
      return "<p>Пси-кости — умение плута «Клинок души» 3 уровня и выше. У этого персонажа его нет.</p><div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Закрыть</button></div>";
    }
    function renderTrinkets() {
      return "<p>Частицы души — умение плута «Фантом» 9 уровня и выше. У этого персонажа его нет.</p><div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Закрыть</button></div>";
    }
    function renderArcanum() {
      return "<p>Мистический арканум — умение колдуна 11 уровня и выше (1 раз за продолжительный отдых, без ячейки). У этого персонажа его нет.</p><div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Закрыть</button></div>";
    }
    function renderInfusions() {
      return "<p>Активные инфузии — умение изобретателя «Инфузия предмета». После продолжительного отдыха отмечаешь, какие из известных инфузий сейчас на предметах. У этого персонажа известных инфузий нет.</p><div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Закрыть</button></div>";
    }
    function renderTelekinetic() {
      const has = !!(ensureAbilState().feats || []).some(function (f) { return f === "telekinetic" || (f && f.slug === "telekinetic"); });
      if (!has) {
        return "<p>Толчок чертой «Телекинез». У этого персонажа этой черты нет.</p><div class=\"modal-actions\"><button type=\"button\" class=\"btn primary\" data-close>Закрыть</button></div>";
      }
      const d = draft();
      if (!d.tkTarget) d.tkTarget = (foes()[0] || {}).id;
      if (!d.tkMode) d.tkMode = "prone";
      const slug = classSlug();
      const abilKey = slug === "wizard" ? "int" : (slug === "cleric" || slug === "druid" ? "wis" : "cha");
      const abilLabel = { int: "Интеллект", wis: "Мудрость", cha: "Харизма" }[abilKey] || "Интеллект";
      const mod = (typeof abilityModOf === "function" && typeof scoreTotal === "function") ? abilityModOf(scoreTotal(abilKey, true)) : 4;
      return "<p>Бонусное действие. Видимое существо в 30 фт. Состязание твоей заклинательной характеристики против Силы или Ловкости цели. Успех — сбить с ног или сдвинуть на 5 фт.</p>" +
        "<p class=\"section-label\">Исход</p><div class=\"pad-row\"><button type=\"button\" class=\"sheet-chip" + (d.tkMode === "prone" ? " is-on" : "") + "\" data-res-act=\"tk-mode\" data-v=\"prone\">Сбить с ног</button>" +
        "<button type=\"button\" class=\"sheet-chip" + (d.tkMode === "push" ? " is-on" : "") + "\" data-res-act=\"tk-mode\" data-v=\"push\">Сдвинуть 5 фт</button></div>" +
        "<p class=\"section-label\">Цель</p>" + chipsTargets(d.tkTarget, "tk-target") +
        (diceOnTable()
          ? fieldNum("Твоя проверка (" + abilLabel + " " + (mod >= 0 ? "+" : "") + mod + ")", "tkMine", d.tkMine, "Сумма") + fieldNum("Состязание цели (Сила или Ловкость)", "tkTheirs", d.tkTheirs, "Сумма цели")
          : "<p class=\"pad-note\">Броски будут сделаны автоматически (1к20" + (mod >= 0 ? "+" : "") + mod + ").</p>") +
        resultLine() + foot("Провести", "tk-go");
    }
    function renderHarnessBlock() {
      syncHarnessPool();
      const r = ensureRules();
      if (!tceFeaturesOn() || !r.harness.max) return "";
      const cap = harnessCap(pb());
      const d = draft();
      if (d.harnessSlot == null) d.harnessSlot = cap;
      const chips = [];
      for (let lv = 1; lv <= cap; lv++) {
        const s = (sheet.slots || {})[lv];
        if (!s || !s.max) continue;
        const spent = (s.max - s.cur) > 0;
        chips.push("<button type=\"button\" class=\"sheet-chip" + (Number(d.harnessSlot) === lv ? " is-on" : "") + (spent ? "" : " is-blocked") + "\" data-res-act=\"harness-slot\" data-v=\"" + lv + "\"" + (spent ? "" : " disabled title=\"Нет потраченной ячейки этого круга\"") + ">" + lv + " ур. (" + s.cur + "/" + s.max + ")</button>");
      }
      const chCur = sheet.channelCur != null ? sheet.channelCur : (sheet.channelMax || 1);
      const can = chCur > 0 && r.harness.cur > 0;
      return "<div class=\"feature-resource\" style=\"margin-top:12px\"><p><strong>Праведное восстановление</strong> <span class=\"src-tag is-optional\">TCE · опционально</span></p>" +
        "<p>Бонусным действием потрать 1 Божественный канал и 1 дневное применение. Верни одну потраченную ячейку не выше половины бонуса мастерства (вверх). Сейчас дневных: " + r.harness.cur + "/" + r.harness.max + ". Потолок круга: " + cap + " (БМ +" + pb() + ").</p>" +
        "<div class=\"pad-row\" style=\"flex-wrap:wrap\">" + (chips.join("") || "<p class=\"pad-note\">Нет подходящих ячеек.</p>") + "</div>" +
        "<div class=\"pad-row\" style=\"margin-top:8px\"><button type=\"button\" class=\"btn\" data-res-act=\"harness-go\"" + (can ? "" : " disabled") + ">Вернуть ячейку</button></div></div>";
    }
    function renderCantripFormulasBlock() {
      if (!(classSlug() === "wizard" && tceFeaturesOn() && (mainClass().level || 0) >= 3)) return "";
      const r = ensureRules();
      const d = draft();
      const known = knownWizardCantrips();
      const catalog = wizardCantrips().filter(function (s) {
        const book = (s.source_book || "PHB").toUpperCase();
        if (book === "PHB") return true;
        if (book === "TCE") return tceFeaturesOn();
        return false;
      });
      if (!catalog.length) return "";
      if (!d.cfFrom) d.cfFrom = known[0];
      if (!d.cfTo) {
        const first = catalog.find(function (s) { return known.indexOf(s.slug) < 0; });
        d.cfTo = first ? first.slug : (catalog[0] && catalog[0].slug);
      }
      const used = !!r.cantripSwapUsed;
      const fromOpts = known.map(function (id) {
        const s = catalog.find(function (x) { return x.slug === id; });
        return "<option value=\"" + esc(id) + "\"" + (d.cfFrom === id ? " selected" : "") + ">" + esc((s && s.name_ru) || id) + "</option>";
      }).join("");
      const toOpts = catalog.filter(function (s) { return known.indexOf(s.slug) < 0 || s.slug === d.cfTo; }).map(function (s) {
        return "<option value=\"" + esc(s.slug) + "\"" + (d.cfTo === s.slug ? " selected" : "") + ">" + esc(s.name_ru) + "</option>";
      }).join("");
      return "<div class=\"feature-resource\" style=\"margin-top:12px\"><p><strong>Формулы заговоров</strong> <span class=\"src-tag is-optional\">TCE · опционально</span>" + (used ? " · уже заменён за этот отдых" : "") + "</p>" +
        "<p>Один раз за этот короткий отдых: замени один известный заговор волшебника на другой из списка волшебника.</p>" +
        "<label>Заменить заговор<select data-res-input=\"cfFrom\"" + (used ? " disabled" : "") + ">" + fromOpts + "</select></label>" +
        "<label>Новый заговор<select data-res-input=\"cfTo\"" + (used ? " disabled" : "") + ">" + toOpts + "</select></label>" +
        "<div class=\"pad-row\"><button type=\"button\" class=\"btn\" data-res-act=\"cf-swap\"" + (used || !d.cfFrom || !d.cfTo ? " disabled" : "") + ">Заменить заговор</button></div></div>";
    }
    function renderCantripVersatility() {
      const slug = classSlug();
      const names = slug === "druid" ? DRUID_CANTRIP_NAMES : CLERIC_CANTRIP_NAMES;
      const r = ensureRules();
      const key = slug === "druid" ? "druidCantrips" : "clericCantrips";
      if (!r[key] || !r[key].length) r[key] = slug === "druid" ? ["shillelagh", "druidcraft", "produce-flame"] : clericCantripsKnown();
      const known = r[key];
      const d = draft();
      if (!d.cvFrom) d.cvFrom = known[0];
      const catalog = Object.keys(names);
      if (!d.cvTo) d.cvTo = catalog.find(function (id) { return known.indexOf(id) < 0; }) || catalog[0];
      return "<p><span class=\"src-tag is-optional\">TCE · опционально</span> Когда получаешь в этом классе «Увеличение характеристик», можешь заменить один известный заговор этого класса на другой из его списка.</p>" +
        "<label>Какой заменить<select data-res-input=\"cvFrom\">" + known.map(function (id) { return "<option value=\"" + esc(id) + "\"" + (d.cvFrom === id ? " selected" : "") + ">" + esc(names[id] || id) + "</option>"; }).join("") + "</select></label>" +
        "<label>Новый заговор<select data-res-input=\"cvTo\">" + catalog.filter(function (id) { return known.indexOf(id) < 0 || id === d.cvTo; }).map(function (id) { return "<option value=\"" + esc(id) + "\"" + (d.cvTo === id ? " selected" : "") + ">" + esc(names[id] || id) + "</option>"; }).join("") + "</select></label>" +
        resultLine() + foot("Заменить заговор", "cv-swap");
    }
    function allPaladinStyles() {
      const base = (CAT.fightingStyles || []).map(function (s) { return Object.assign({}, s, { tce: false }); });
      const tce = TCE_STYLES.filter(function (s) { return s.paladin; });
      return base.concat(tce).filter(function (s) {
        if (!s.tce) return true;
        if (pickOf("fighting_style_paladin") === s.id) return true;
        return tceFeaturesOn();
      });
    }
    function styleBadge(s) {
      if (!s.tce) return "";
      return tceAllowedVal() === null ? " · Tasha · опционально" : " · TCE · опционально";
    }
    function renderMartialVersatility() {
      const cur = draft().mvStyle || pickOf("fighting_style_paladin") || "defense";
      const list = allPaladinStyles();
      const chips = list.map(function (s) {
        return "<button type=\"button\" class=\"sheet-chip" + (cur === s.id ? " is-on" : "") + "\" data-res-act=\"mv-pick\" data-v=\"" + esc(s.id) + "\">" + esc(s.name_ru) + esc(styleBadge(s)) + "</button>";
      }).join("");
      const def = list.find(function (s) { return s.id === cur; });
      return "<p><span class=\"src-tag is-optional\">TCE · опционально</span> Когда получаешь в этом классе «Увеличение характеристик», можешь заменить выбранный стиль боя на другой из списка паладина.</p>" +
        "<div class=\"pad-row\" style=\"flex-wrap:wrap\">" + chips + "</div>" +
        (def ? "<p>" + esc(ty(def.summary_ru)) + "</p>" : "") +
        resultLine() + foot("Сменить стиль", "mv-go");
    }
    function renderWildCompanionNote() {
      const hours = Math.max(1, Math.floor((mainClass().level || 7) / 2));
      return "<p><span class=\"src-tag is-optional\">TCE · опционально</span> Потрать одно применение «Дикого облика», чтобы сотворить «Поиск фамильяра» без ячейки. Фамильяр — фея, длительность " + hours + " ч. (половина уровня друида).</p>" +
        "<div class=\"modal-actions\"><button type=\"button\" class=\"btn\" data-close>Отмена</button><button type=\"button\" class=\"btn primary\" data-res-act=\"wild-companion\">Выбрать облик</button></div>";
    }

    const _renderChannel = renderChannel;
    renderChannel = function () {
      const base = _renderChannel();
      const extra = renderHarnessBlock() + resultLine();
      if (!extra) return base;
      return String(base).replace(/<div class="modal-actions">/, extra + "<div class=\"modal-actions\">");
    };
    const _renderRest = renderRest;
    renderRest = function () {
      const html = _renderRest();
      const labels = restLabels();
      let out = String(html);
      out = out.replace(/>Короткий отдых</g, ">" + labels.chipShort + "<");
      out = out.replace(/>Продолжительный отдых</g, ">" + labels.chipLong + "<");
      if (sheet.restKind !== "long") {
        const block = renderCantripFormulasBlock();
        if (block) out = out.replace("<p class=\"section-label\">Кости хитов</p>", block + "<p class=\"section-label\">Кости хитов</p>");
      } else if (masterFlag("xge_no_long_rest")) {
        out = out.replace("<p class=\"section-label\">Что восстановится</p>", "<p class=\"pad-note\">Продолжительный отдых сбросит счётчик суток без длинного отдыха (сейчас " + (ensureRules().noLongRestDays || 0) + ").</p><p class=\"section-label\">Что восстановится</p>");
      }
      return out;
    };
    const _renderStylePicker = renderStylePicker;
    renderStylePicker = function () {
      const cur = pickOf("fighting_style_paladin") || "defense";
      const list = allPaladinStyles();
      const chips = list.map(function (s) {
        return "<button type=\"button\" class=\"sheet-chip" + (cur === s.id ? " is-on" : "") + "\" data-abil-act=\"pick-style\" data-v=\"" + esc(s.id) + "\">" + esc(s.name_ru) + esc(styleBadge(s)) + "</button>";
      }).join("");
      const def = list.find(function (s) { return s.id === cur; });
      return "<div class=\"pad-row\" style=\"flex-wrap:wrap;margin-top:8px\">" + chips + "</div>" + (def ? "<p>" + esc(ty(def.summary_ru)) + "</p>" : "");
    };
    const _useActionFor = useActionFor;
    useActionFor = function (f) {
      const id = f.id || "";
      if (id === "cd_harness_divine_power") return { open: "res-channel", label: "Восстановить ячейку" };
      if (id === "wild_companion") return { open: "wild-companion", label: "Дикий спутник" };
      if (id === "cantrip_formulas") return { open: "rest", label: "Заменить заговор" };
      if (id === "cantrip_versatility_cleric" || id === "cantrip_versatility_druid") return { open: "cantrip-versatility", label: "Заменить заговор" };
      if (id === "martial_versatility_paladin") return { open: "martial-versatility", label: "Сменить стиль" };
      return _useActionFor(f);
    };
    const _renderFeatureCard = renderFeatureCard;
    renderFeatureCard = function (f) {
      let html = _renderFeatureCard(f);
      if (f && f.optional) {
        const badge = optionalBadge(f);
        if (badge) html = html.replace("</span></span><span class=\"scene-card__meta\">", " " + badge + "</span></span><span class=\"scene-card__meta\">");
      }
      return html;
    };
    const _grantsForLevel = grantsForLevel;
    grantsForLevel = function (slug, newLevel) {
      const out = _grantsForLevel(slug, newLevel);
      if (tceFeaturesOn()) {
        const pack = (CAT.classes || {})[slug];
        if (pack) {
          (pack.features || []).forEach(function (f) {
            if (!f.optional || f.level !== newLevel) return;
            if (out.some(function (g) { return g.feature && g.feature.id === f.id; })) return;
            if (String(f.id || "").indexOf("asi_") === 0) out.push({ type: "asi", feature: f, source: "class" });
            else out.push({ type: "feature", feature: f, source: "class" });
          });
        }
      }
      return out;
    };

    LIVE["disarm"] = { title: "Обезоруживание", body: renderDisarm };
    LIVE["mark"] = { title: "Метка", body: renderMark };
    LIVE["overrun"] = { title: "Пробегание", body: function () { return renderOverrunTumble("overrun"); } };
    LIVE["tumble"] = { title: "Кувырок", body: function () { return renderOverrunTumble("tumble"); } };
    LIVE["climb-bigger"] = { title: "Взбирание на большее существо", body: renderClimbBigger };
    LIVE["identify-spell"] = { title: "Распознать заклинание", body: renderIdentifySpell };
    LIVE["falling"] = { title: "Падение", body: renderFalling };
    LIVE["no-long-rest"] = { title: "Сутки без длинного отдыха", body: renderNoLongRest };
    LIVE["cleave"] = { title: "Разрубание", body: renderCleave };
    LIVE["massive-damage"] = { title: "Массивный урон", body: renderMassive };
    LIVE["lingering"] = { title: "Незаживающие раны", body: renderLingering };
    LIVE["morale"] = { title: "Проверка морали", body: renderMorale };
    LIVE["hero-point"] = { title: "Очки героя", body: renderHeroPoint };
    LIVE["prof-die"] = { title: "Кость мастерства", body: renderProfDie };
    LIVE["opportunity-attack"] = { title: "Атака по возможности", body: renderOpportunityFull };
    LIVE["counterspell"] = { title: "Контрзаклинание", body: renderCounterspell };
    LIVE["res-ki"] = { title: "Ци", body: renderKi };
    LIVE["res-sorcery"] = { title: "Очки чародейства", body: renderSorcery };
    LIVE["res-bardic"] = { title: "Бардовское вдохновение", body: renderBardic };
    LIVE["res-superiority"] = { title: "Кости превосходства", body: renderSuperiority };
    LIVE["res-psionic"] = { title: "Пси-кости", body: renderPsionic };
    LIVE["res-trinkets"] = { title: "Частицы души", body: renderTrinkets };
    LIVE["res-arcanum"] = { title: "Мистический арканум", body: renderArcanum };
    LIVE["infusions"] = { title: "Активные инфузии", body: renderInfusions };
    LIVE["telekinetic"] = { title: "Толчок (Телекинез)", body: renderTelekinetic };
    LIVE["cantrip-versatility"] = { title: "Универсальность заговора", body: renderCantripVersatility };
    LIVE["martial-versatility"] = { title: "Боевая универсальность", body: renderMartialVersatility };
    LIVE["wild-companion"] = { title: "Дикий спутник", body: renderWildCompanionNote };
    if (LIVE["res-channel"]) LIVE["res-channel"].body = renderChannel;
    if (LIVE["rest"]) LIVE["rest"].body = renderRest;


    const _canOpen2 = canOpenClassDialog;
    canOpenClassDialog = function (id, kind) {
      if (id === "res-ki") return classSlug() === "monk";
      if (id === "res-sorcery") return classSlug() === "sorcerer";
      if (id === "res-bardic") return classSlug() === "bard";
      if (id === "res-superiority") return classSlug() === "fighter" || !!(ensureAbilState().feats || []).some(function (f) { return f === "martial_adept" || (f && f.slug === "martial_adept"); });
      if (id === "res-psionic" || id === "res-trinkets") return classSlug() === "rogue";
      if (id === "res-arcanum") return classSlug() === "warlock";
      if (id === "infusions") return classSlug() === "artificer";
      if (id === "telekinetic") return !!(ensureAbilState().feats || []).some(function (f) { return f === "telekinetic" || (f && f.slug === "telekinetic"); });
      if (id === "cantrip-versatility") return tceFeaturesOn() && (classSlug() === "cleric" || classSlug() === "druid") && (mainClass().level || 0) >= 4;
      if (id === "martial-versatility") return tceFeaturesOn() && classSlug() === "paladin" && (mainClass().level || 0) >= 4;
      if (id === "wild-companion") return tceFeaturesOn() && classSlug() === "druid" && (mainClass().level || 0) >= 2;
      if (id === "familiar-pick" && (kind === "wild_companion" || (typeof ensureCompanionsState === "function" && ensureCompanionsState().familiarMode === "wild_companion"))) {
        return tceFeaturesOn() && classSlug() === "druid" && (mainClass().level || 0) >= 2;
      }
      if (MASTER_BTN[id] && !masterFlag(MASTER_BTN[id])) return false;
      return _canOpen2(id, kind);
    };

    function syncMasterButtons() {
      $$("[data-more-actions] [data-open]").forEach(function (btn) {
        const id = btn.getAttribute("data-open");
        const key = MASTER_BTN[id];
        if (!key) return;
        btn.hidden = !masterFlag(key);
      });
    }
    function syncDemoToggles() {
      $$("[data-set-tce]").forEach(function (b) {
        const v = b.getAttribute("data-set-tce");
        const cur = tceAllowedVal();
        const on = (v === "null" && cur === null) || (v === "on" && cur === true) || (v === "off" && cur === false);
        b.classList.toggle("is-on", on);
      });
      $$("[data-set-master]").forEach(function (b) {
        const want = b.getAttribute("data-set-master") === "on";
        const any = Object.keys(MASTER_BTN).some(function (id) { return masterFlag(MASTER_BTN[id]); });
        b.classList.toggle("is-on", want ? any : !any);
      });
    }
    function setTce(v) {
      const r = ensureRules();
      r.tceAllowed = v;
      syncHarnessPool();
      if (r.harness.max) r.harness.cur = r.harness.max;
      if (typeof renderFeaturesScene === "function") renderFeaturesScene();
      syncDemoToggles();
      if (typeof refreshLive === "function") refreshLive();
    }
    function setMasterAll(on) {
      const r = ensureRules();
      Object.keys(MASTER_BTN).forEach(function (id) { r.master[MASTER_BTN[id]] = !!on; });
      if (on) { r.hero.inited = false; syncHeroPool(); }
      else { r.hero.inited = false; }
      syncMasterButtons();
      syncDemoToggles();
      if (typeof refreshLive === "function") refreshLive();
    }

    function contestRoll(mod) { return rollDie(20) + (Number(mod) || 0); }
    function done(msg) {
      ensureRules().result = msg;
      if (typeof refreshLive === "function") refreshLive();
      if (typeof toast === "function" && msg) toast(msg);
    }
    function handleResAct(act, v) {
      const r = ensureRules();
      const d = draft();
      if (act === "disarm-target") { d.disarmTarget = v; refreshLive(); return; }
      if (act === "mark-target") { d.markTarget = v; refreshLive(); return; }
      if (act === "overrun-target") { d.overTarget = v; refreshLive(); return; }
      if (act === "tumble-target") { d.tumbleTarget = v; refreshLive(); return; }
      if (act === "overrun-act" || act === "tumble-act") { d[act === "overrun-act" ? "overAct" : "tumbleAct"] = v; refreshLive(); return; }
      if (act === "over-size") { d.overSize = d.overSize === v ? "same" : v; refreshLive(); return; }
      if (act === "climb-target") { d.climbTarget = v; refreshLive(); return; }
      if (act === "climb-mode") { d.climbMode = v; refreshLive(); return; }
      if (act === "climb-skill") { d.climbSkill = v; refreshLive(); return; }
      if (act === "fall-who") { d.fallWho = v; refreshLive(); return; }
      if (act === "cleave-target") { d.cleaveTarget = v; refreshLive(); return; }
      if (act === "mass-who") { d.massWho = v; refreshLive(); return; }
      if (act === "ling-reason") { d.lingReason = v; refreshLive(); return; }
      if (act === "oa-trigger") { d.oaTrigger = v; refreshLive(); return; }
      if (act === "oa-target") { d.oaTarget = v; refreshLive(); return; }
      if (act === "oa-mode") { d.oaMode = v; refreshLive(); return; }
      if (act === "cs-slot") { d.csSlot = Number(v); refreshLive(); return; }
      if (act === "tk-mode") { d.tkMode = v; refreshLive(); return; }
      if (act === "tk-target") { d.tkTarget = v; refreshLive(); return; }
      if (act === "harness-slot") { d.harnessSlot = Number(v); refreshLive(); return; }
      if (act === "mv-pick") { d.mvStyle = v; refreshLive(); return; }

      if (act === "disarm-go") {
        const t = targetById(d.disarmTarget);
        const atk = diceOnTable() && d.disarmAtk !== "" && d.disarmAtk != null ? Number(d.disarmAtk) : contestRoll(7);
        const def = diceOnTable() && d.disarmDef !== "" && d.disarmDef != null ? Number(d.disarmDef) : contestRoll(2);
        const item = d.disarmItem || "оружие";
        const ok = atk >= def;
        done((ok ? (t.name + " выронил " + item) : ("провал · " + t.name + " удержал " + item)) + " · атака " + atk + " vs " + def);
        return;
      }
      if (act === "mark-go") {
        const t = targetById(d.markTarget);
        d.marked = t.id;
        done("Метка: " + t.name + " до конца твоего следующего хода.");
        return;
      }
      if (act === "overrun-go" || act === "tumble-go") {
        const isOver = act === "overrun-go";
        const t = targetById(isOver ? d.overTarget : d.tumbleTarget);
        const skill = isOver ? "athletics" : "acrobatics";
        const mineKey = isOver ? "overrunMine" : "tumbleMine";
        const theirKey = isOver ? "overrunTheirs" : "tumbleTheirs";
        const mine = diceOnTable() && d[mineKey] != null && d[mineKey] !== "" ? Number(d[mineKey]) : contestRoll(skillMod(skill));
        const theirs = diceOnTable() && d[theirKey] != null && d[theirKey] !== "" ? Number(d[theirKey]) : contestRoll(2);
        const ok = mine >= theirs;
        done(ok ? ("успех · можно пройти сквозь пространство " + t.name + " (один раз в этот ход)") : ("провал · " + t.name));
        return;
      }
      if (act === "climb-go") {
        const t = targetById(d.climbTarget);
        const mine = diceOnTable() && d.climbMine !== "" && d.climbMine != null ? Number(d.climbMine) : contestRoll(skillMod(d.climbSkill || "athletics"));
        const theirs = diceOnTable() && d.climbTheirs !== "" && d.climbTheirs != null ? Number(d.climbTheirs) : contestRoll(2);
        const ok = mine >= theirs;
        if (d.climbMode === "shake") done(ok ? ("успех · " + t.name + " сброшен") : ("провал · " + t.name + " остаётся на существе"));
        else done(ok ? ("успех · на существе " + t.name + " · атаки по нему с преимуществом") : ("провал · " + t.name));
        return;
      }
      if (act === "ident-go") {
        const lv = Math.max(0, Math.min(9, Math.floor(Number(d.identLevel) || 0)));
        const dc = 15 + lv;
        const total = diceOnTable() && d.identTotal !== "" && d.identTotal != null ? Number(d.identTotal) : contestRoll(skillMod("arcana"));
        const name = d.identName || "заклинание";
        const ok = total >= dc;
        done("Распознать заклинание: Анализ " + total + " vs Сл " + dc + " → " + (ok ? ("распознал «" + name + "»") : "не распознал"));
        return;
      }
      if (act === "fall-go") {
        const feet = Number(d.fallFeet) || 0;
        const dice = fallingDice(feet);
        let total, rolls = [];
        if (diceOnTable() && d.fallDmg !== "" && d.fallDmg != null) total = Number(d.fallDmg);
        else {
          total = 0;
          for (let i = 0; i < dice; i++) { const n = rollDie(6); rolls.push(n); total += n; }
        }
        const prone = total > 0;
        const who = d.fallWho === "self" ? (sheet.name || "ты") : (targetById(d.fallWho) || {}).name;
        if (d.fallWho === "self" && typeof sheet.hp === "number") sheet.hp = Math.max(0, sheet.hp - total);
        done("Падение " + feet + " фт → " + (dice ? dice + "к6" : "0") + (rolls.length ? " (" + rolls.join("+") + ")" : "") + " = " + total + (prone ? " · Опрокинутый" : "") + " · " + who);
        if (typeof syncHeader === "function") syncHeader();
        return;
      }
      if (act === "nlr-go") {
        const dc = noLongRestDc(r.noLongRestDays || 0);
        const con = (typeof abilityModOf === "function" && typeof scoreTotal === "function") ? abilityModOf(scoreTotal("con", true)) : 2;
        const total = diceOnTable() && d.nlrTotal !== "" && d.nlrTotal != null ? Number(d.nlrTotal) : contestRoll(con);
        const ok = total >= dc;
        r.noLongRestDays = (r.noLongRestDays || 0) + 1;
        if (!ok) sheet.exhaustion = Math.min(6, (sheet.exhaustion || 0) + 1);
        done("Сутки без длинного отдыха: Тел " + total + " vs Сл " + dc + " → " + (ok ? "успех" : "провал · +1 истощение"));
        if (typeof syncHeader === "function") syncHeader();
        return;
      }
      if (act === "cleave-skip") { done("Разрубание пропущено."); if (typeof closeDialog === "function") closeDialog(); return; }
      if (act === "cleave-go") {
        const t = targetById(d.cleaveTarget);
        const ov = Number(d.cleaveOverflow) || 0;
        const atk = d.cleaveAtk == null || d.cleaveAtk === "" ? null : Number(d.cleaveAtk);
        const hit = atk == null || t.ac == null || atk >= t.ac;
        if (!hit) { done("Не удалось перенести урон: бросок не попал бы по " + t.name + "."); return; }
        done("Разрубание · остаток " + ov + " → " + t.name + (atk != null ? " (атака " + atk + ")" : ""));
        return;
      }
      if (act === "mass-save") {
        const con = (typeof abilityModOf === "function" && typeof scoreTotal === "function") ? abilityModOf(scoreTotal("con", true)) : 2;
        const total = diceOnTable() && d.massSave !== "" && d.massSave != null ? Number(d.massSave) : contestRoll(con);
        const who = d.massWho === "self" || !d.massWho ? (sheet.name || "ты") : (targetById(d.massWho) || {}).name;
        const ok = total >= 15;
        if (ok) { d.massPhase = "done"; done("Массивный урон · " + who + ": спасён (Сл 15, " + total + ")"); }
        else { d.massPhase = "shock"; done("Массивный урон · " + who + ": провал → системный шок (Тел " + total + ")"); }
        return;
      }
      if (act === "mass-shock") {
        const roll = diceOnTable() && d.massShock ? Number(d.massShock) : rollDie(10);
        const row = lookupTable(SYSTEM_SHOCK, roll, 1, 10);
        const who = d.massWho === "self" || !d.massWho ? (sheet.name || "ты") : (targetById(d.massWho) || {}).name;
        d.massPhase = "done";
        done("Системный шок · " + who + ": к10=" + roll + " · " + row.name_ru + ". " + ty(row.effect_ru));
        return;
      }
      if (act === "ling-go") {
        const roll = diceOnTable() && d.lingRoll ? Number(d.lingRoll) : rollDie(20);
        const row = lookupTable(LINGERING, roll, 1, 20);
        const reason = ({ crit: "критический удар", zero: "падение до 0 хитов", shock: "провал спаса массивного урона" })[d.lingReason || "crit"];
        r.lingering = { roll: roll, name: row.name_ru, effect: row.effect_ru };
        done("Незаживающая рана (" + reason + "): к20=" + roll + " · " + row.name_ru + ". " + ty(row.effect_ru));
        return;
      }
      if (act === "morale-go") {
        const names = foes().filter(function (t) { return d.moraleWho && d.moraleWho[t.id]; }).map(function (t) { return t.name; });
        if (!names.length) { done("Выбери врагов."); return; }
        const total = d.moraleOver ? 0 : (diceOnTable() && d.moraleSave !== "" && d.moraleSave != null ? Number(d.moraleSave) : contestRoll(0));
        const ok = !d.moraleOver && total >= 10;
        const label = ok ? "держатся" : (d.moraleSurrender ? "сдаётся" : "бежит");
        done(ok
          ? ("Мораль · " + names.join(", ") + ": держатся (спас " + total + " ≥ Сл 10)")
          : ("Мораль · " + names.join(", ") + ": " + label + " (спас " + (d.moraleOver ? "автопровал" : total) + " < Сл 10)"));
        return;
      }
      if (act === "hero-d6" || act === "hero-stab" || act === "hero-death") {
        if ((r.hero.cur || 0) <= 0) { done("Нет очков героя"); return; }
        r.hero.cur -= 1;
        if (act === "hero-stab") { done("Очко героя: стабилизация · осталось " + r.hero.cur); return; }
        if (act === "hero-death") { done("Очко героя: успех на спасброске от смерти · осталось " + r.hero.cur); return; }
        const d6 = diceOnTable() && d.heroD6 ? Number(d.heroD6) : rollDie(6);
        done("Очко героя: +" + d6 + " (к6) к броску к20 · осталось " + r.hero.cur);
        return;
      }
      if (act === "prof-go") {
        const sides = profDieSides(pb());
        if (!sides) return;
        const roll = diceOnTable() && d.profRoll ? Number(d.profRoll) : rollDie(sides);
        done("Кость мастерства к" + sides + "=" + roll + " вместо БМ +" + pb() + ".");
        return;
      }
      if (act === "oa-go") {
        const t = targetById(d.oaTarget);
        const name = d.oaName || t.name;
        done("Атака по возможности · " + name + (d.oaTrigger === "enter" ? " (вход в досягаемость)" : " (выход из досягаемости)"));
        if (typeof closeDialog === "function") closeDialog();
        return;
      }
      if (act === "cs-go") {
        const slot = Number(d.csSlot) || 3;
        const s = (sheet.slots || {})[slot];
        if (!s || s.cur <= 0) { done("Нет свободной ячейки " + slot + " круга."); return; }
        s.cur -= 1;
        const auto = slot > Number(d.csTargetLv);
        const dc = 10 + Number(d.csTargetLv || 0);
        const slug = classSlug();
        const abil = slug === "wizard" ? "int" : (slug === "paladin" ? "cha" : "wis");
        const bonus = (typeof abilityModOf === "function" && typeof scoreTotal === "function" ? abilityModOf(scoreTotal(abil, true)) : 4) + pb();
        const check = auto ? null : (diceOnTable() && d.csCheck ? Number(d.csCheck) : contestRoll(bonus));
        const ok = auto || check >= dc;
        const nm = d.csName ? " «" + d.csName + "»" : "";
        done("Контрзаклинание" + nm + ": " + (auto ? ("успех без проверки (ячейка " + slot + " > круг " + d.csTargetLv + ")") : ((ok ? "успех" : "провал") + " · проверка " + check + " vs Сл " + dc)));
        if (typeof syncHeader === "function") syncHeader();
        return;
      }
      if (act === "harness-go") {
        syncHarnessPool();
        const chCur = sheet.channelCur != null ? sheet.channelCur : (sheet.channelMax || 1);
        const lv = Number(d.harnessSlot) || harnessCap(pb());
        const slot = (sheet.slots || {})[lv];
        if (chCur <= 0) { done("Нет применений Божественного канала."); return; }
        if ((r.harness.cur || 0) <= 0) { done("Нет дневных применений Праведного восстановления."); return; }
        if (!slot || slot.cur >= slot.max) { done("Нет потраченной ячейки " + lv + " круга."); return; }
        if (lv > harnessCap(pb())) { done("Круг выше потолка (половина БМ вверх)."); return; }
        slot.cur += 1;
        sheet.channelCur = chCur - 1;
        if (sheet.channel) { sheet.channel.cur = sheet.channelCur; sheet.channel.max = sheet.channelMax || sheet.channel.max; }
        r.harness.cur -= 1;
        done("Праведное восстановление: возвращена ячейка " + lv + " круга.");
        if (typeof syncHeader === "function") syncHeader();
        return;
      }
      if (act === "cf-swap") {
        if (r.cantripSwapUsed) return;
        const known = knownWizardCantrips();
        const from = d.cfFrom, to = d.cfTo;
        const catalog = wizardCantrips();
        const toRow = catalog.find(function (s) { return s.slug === to; });
        if (!from || !toRow) return;
        const ix = known.indexOf(from);
        if (ix >= 0) known[ix] = to;
        r.cantripSwapUsed = true;
        done("Формулы заговоров: заменён на «" + toRow.name_ru + "»");
        return;
      }
      if (act === "cv-swap") {
        const slug = classSlug();
        const key = slug === "druid" ? "druidCantrips" : "clericCantrips";
        const names = slug === "druid" ? DRUID_CANTRIP_NAMES : CLERIC_CANTRIP_NAMES;
        const known = r[key] || [];
        const ix = known.indexOf(d.cvFrom);
        if (ix >= 0 && d.cvTo) known[ix] = d.cvTo;
        r[key] = known;
        done("Универсальность заговора: заменён на «" + (names[d.cvTo] || d.cvTo) + "»");
        return;
      }
      if (act === "mv-go") {
        const id = d.mvStyle || pickOf("fighting_style_paladin");
        if (id) {
          ensureAbilState().featurePicks.fighting_style_paladin = id;
          const def = allPaladinStyles().find(function (s) { return s.id === id; });
          done("Боевая универсальность: стиль «" + ((def && def.name_ru) || id) + "».");
        }
        return;
      }
      if (act === "wild-companion") {
        const c = (typeof ensureCompanionsState === "function") ? ensureCompanionsState() : (sheet.comp || {});
        c.familiarMode = "wild_companion";
        c.hasFindFamiliar = true;
        if (typeof openFamiliarPick === "function") openFamiliarPick("wild_companion");
        else if (typeof openDialog === "function") openDialog("familiar-pick");
        return;
      }
      if (act === "tk-go") {
        const t = targetById(d.tkTarget);
        const slug = classSlug();
        const abilKey = slug === "wizard" ? "int" : (slug === "cleric" || slug === "druid" ? "wis" : "cha");
        const mod = (typeof abilityModOf === "function" && typeof scoreTotal === "function") ? abilityModOf(scoreTotal(abilKey, true)) : 4;
        const mine = diceOnTable() && d.tkMine != null && d.tkMine !== "" ? Number(d.tkMine) : contestRoll(mod);
        const theirs = diceOnTable() && d.tkTheirs != null && d.tkTheirs !== "" ? Number(d.tkTheirs) : contestRoll(2);
        const ok = mine >= theirs;
        const natural = mine - mod;
        done((d.tkMode === "prone" ? "Телекинез: опрокинуть" : "Телекинез: сдвинуть 5 фт") +
          " (к20=" + natural + (mod >= 0 ? "+" : "") + mod + ") · " + (ok ? ("успех · " + t.name + (d.tkMode === "prone" ? " опрокинут" : " сдвинут на 5 фт")) : ("провал · " + t.name)));
      }
    }

    document.addEventListener("click", function (e) {
      const tceBtn = e.target.closest && e.target.closest("[data-set-tce]");
      if (tceBtn) {
        const v = tceBtn.getAttribute("data-set-tce");
        setTce(v === "on" ? true : v === "off" ? false : null);
        e.preventDefault();
        return;
      }
      const mBtn = e.target.closest && e.target.closest("[data-set-master]");
      if (mBtn) {
        setMasterAll(mBtn.getAttribute("data-set-master") === "on");
        e.preventDefault();
        return;
      }
      const actEl = e.target.closest && e.target.closest("[data-res-act]");
      if (actEl) {
        handleResAct(actEl.getAttribute("data-res-act"), actEl.getAttribute("data-v"));
        e.preventDefault();
      }
    });
    document.addEventListener("input", function (e) {
      const el = e.target;
      if (!el || !el.getAttribute || !el.hasAttribute("data-res-input")) return;
      const key = el.getAttribute("data-res-input");
      const val = el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value;
      setDraft(key, val);
      if (key === "cfFrom" || key === "cfTo" || key === "identLevel" || key === "csTargetLv" || key === "fallFeet" || key === "massDmg" || key === "cleaveOverflow" || key === "cleaveAtk" || key === "cvFrom" || key === "cvTo") {
        if (typeof refreshLive === "function") refreshLive();
      }
    });
    document.addEventListener("change", function (e) {
      const el = e.target;
      if (!el || !el.getAttribute) return;
      if (el.hasAttribute("data-res-check")) {
        const key = el.getAttribute("data-res-check");
        const d = draft();
        if (key.indexOf("mh:") === 0) { d.moraleHints = d.moraleHints || {}; d.moraleHints[key.slice(3)] = !!el.checked; }
        else if (key.indexOf("mw:") === 0) { d.moraleWho = d.moraleWho || {}; d.moraleWho[key.slice(3)] = !!el.checked; }
        else d[key] = !!el.checked;
        if (typeof refreshLive === "function") refreshLive();
      }
      if (el.hasAttribute("data-res-input")) {
        setDraft(el.getAttribute("data-res-input"), el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value);
        if (typeof refreshLive === "function") refreshLive();
      }
    });

    const _setDemo = setDemoChar;
    setDemoChar = function (id) {
      const r = ensureRules();
      const keepTce = r.tceAllowed;
      const keepMaster = Object.assign({}, r.master);
      _setDemo(id);
      sheet.rules = ensureRules();
      sheet.rules.tceAllowed = keepTce;
      sheet.rules.master = keepMaster;
      sheet.rules.draft = {};
      sheet.rules.result = "";
      sheet.rules.cantripSwapUsed = false;
      sheet.rules.lingering = null;
      sheet.rules.hero.inited = false;
      sheet.rules.harness = { cur: 0, max: 0 };
      syncHarnessPool();
      if (sheet.rules.harness.max) sheet.rules.harness.cur = sheet.rules.harness.max;
      if (masterFlag("dmg_hero_points")) { sheet.rules.hero.inited = false; syncHeroPool(); }
      if (typeof applyMagicForDemoChar === "function") applyMagicForDemoChar(id);
      if (typeof renderFeaturesScene === "function") renderFeaturesScene();
      syncMasterButtons();
      syncDemoToggles();
    };

    const _openDialog2 = openDialog;
    openDialog = function (id) {
      const r = ensureRules();
      r.result = "";
      if (id === "massive-damage") r.draft.massPhase = "save";
      if (id === "rest" && classSlug() === "wizard" && tceFeaturesOn()) {
        if (sheet.restKind == null) sheet.restKind = "short";
      }
      const key = MASTER_BTN[id];
      if (key && !masterFlag(key)) {
        if (typeof toast === "function") toast("Это правило стола сейчас выключено");
        return false;
      }
      if (!canOpenClassDialog(id)) return refuseClassDialog();
      return _openDialog2(id);
    };

    let _restKindBefore = null;
    document.addEventListener("click", function (e) {
      const el = e.target.closest && e.target.closest("[data-sheet-act=\"rest-apply\"]");
      if (el) _restKindBefore = sheet.restKind;
    }, true);
    document.addEventListener("click", function (e) {
      const el = e.target.closest && e.target.closest("[data-sheet-act=\"rest-apply\"]");
      if (!el) return;
      const kind = _restKindBefore;
      const r = ensureRules();
      if (kind === "long") {
        r.noLongRestDays = 0;
        syncHarnessPool();
        r.harness.cur = r.harness.max;
        r.cantripSwapUsed = false;
      }
      if (kind === "short") r.cantripSwapUsed = false;
    });

    const _rfs = renderFeaturesScene;
    renderFeaturesScene = function () {
      if (document.querySelector("[data-scene-body]") && typeof render === "function") {
        if (typeof state !== "undefined" && state.scene === "features") render();
        return;
      }
      _rfs();
    };

    syncHarnessPool();
    syncMasterButtons();
    syncDemoToggles();
    if (typeof renderFeaturesScene === "function") renderFeaturesScene();

    if (!document.getElementById("res-step8-css")) {
      const st = document.createElement("style");
      st.id = "res-step8-css";
      st.textContent = ".src-tag.is-optional{margin-left:4px;font-weight:600}.row-check{font:inherit}.feature-resource{padding:8px 0;border-top:1px solid var(--line)}.turn-more [data-open][hidden]{display:none!important}";
      document.head.appendChild(st);
    }

    window.SheetProto = window.SheetProto || {};
    window.SheetProto.setTce = setTce;
    window.SheetProto.setMasterAll = setMasterAll;
    window.SheetProto.ensureRules = ensureRules;
    window.SheetProto.tceAllowed = tceAllowedVal;
    window.SheetProto.tceFeaturesOn = tceFeaturesOn;
    window.SheetProto.syncMasterButtons = syncMasterButtons;
    window.SheetProto.setDemoChar = setDemoChar;
    window.SheetProto.openDialog = openDialog;
    window.SheetProto.renderFeaturesScene = renderFeaturesScene;
    window.SheetProto.getSheet = function () { return sheet; };
    window.SheetProto.spendSlot = function (lv, n) {
      const s = sheet.slots && sheet.slots[lv];
      if (!s) return;
      s.cur = Math.max(0, (s.max || 0) - (n || 1));
    };
    window.SheetProto.applyMagicForDemoChar = applyMagicForDemoChar;
    window.SheetProto.auditMagicColumn = auditMagicColumn;
  })();
    function featureSourceChip(f) {
      return esc(f.sourceLabel || f.className || f.name_ru || "умение");
    }
    const _renderFeatureCard0 = renderFeatureCard;
    renderFeatureCard = function (f) {
      let html = _renderFeatureCard0(f);
      html = html.replace('<span aria-hidden="true"></span>', "");
      html = html.replace(/class="btn primary"/g, 'class="inv-act is-primary"');
      html = html.replace(/class="btn"/g, 'class="inv-act"');
      return html;
    };
    const _renderStaticCard0 = renderStaticCard;
    renderStaticCard = function () {
      let html = _renderStaticCard0.apply(this, arguments);
      html = html.replace('<span aria-hidden="true"></span>', "");
      return html;
    };
    function renderFeaturesBody() {
      const a = ensureAbilState();
      const filters = FILTERS.map(function (row) {
        const on = a.filter === row.id;
        return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-feat-filter="' + row.id + '" role="tab" aria-selected="' + (on ? "true" : "false") + '">' + row.label + "</button>";
      }).join("");
      const c = (typeof ensureCompanionsState === "function") ? ensureCompanionsState() : (sheet.comp || {});
      const menuOpen = !!(typeof state !== "undefined" && state.featMenuOpen);
      const menuItems = [];
      menuItems.push('<button type="button" data-feat-collapse="all">Свернуть все</button>');
      menuItems.push('<button type="button" data-feat-expand="all">Развернуть все</button>');
      if (c.wildUnlocked || (c.circleFeatures || []).indexOf("wild_shape") >= 0) menuItems.push('<button type="button" data-open="wild-shape">Дикий облик</button>');
      if (c.hasPolymorph) menuItems.push('<button type="button" data-open="spell-form">Полиморф</button>');
      if (typeof tceFeaturesOn === "function" && tceFeaturesOn() && classSlug() === "druid" && (mainClass().level || 0) >= 2) {
        menuItems.push('<button type="button" data-open="wild-companion">Дикий спутник</button>');
      }
      if (classSlug() === "warlock") menuItems.push('<button type="button" data-open="invocations">Мистические воззвания</button>');
      if (classSlug() === "ranger") menuItems.push('<button type="button" data-open="ranger-favored">Избранное следопыта</button>');
      if (classSlug() === "wizard") {
        menuItems.push('<button type="button" data-open="wizard-feature">Книга заклинаний</button>');
        menuItems.push('<button type="button" data-open="res-arcane">Ритуалы / восстановление</button>');
      }
      if (classSlug() === "sorcerer") menuItems.push('<button type="button" data-open="res-sorcery">Очки чародейства</button>');
      if (a.pendingAsi) menuItems.push('<button type="button" data-open="asi">Увеличение характеристик</button>');
      menuItems.push('<button type="button" data-open="class-setup">Класс</button>');
      menuItems.push('<button type="button" data-open="subclass-setup">Подкласс</button>');
      menuItems.push('<button type="button" data-open="race-setup">Вид</button>');
      menuItems.push('<button type="button" data-open="bg-setup">Предыстория</button>');
      menuItems.push('<button type="button" data-open="feat-setup">Черта</button>');
      menuItems.push('<button type="button" data-open="level-up">Повышение уровня</button>');
      const menu = menuOpen ? '<div class="inv-menu" data-scene-menu>' + menuItems.join("") + "</div>" : "";
      const tools = '<button type="button" class="chip" data-open="feature-form">+ Добавить</button>' +
        '<button type="button" class="turn-config" data-toggle-feat-menu aria-label="Настроить способности" title="Настроить способности" aria-expanded="' + (menuOpen ? "true" : "false") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-settings"/></svg></button>' +
        menu;
      const q = (a.query || "").trim().toLowerCase();
      const cls = mainClass();
      const features = listFeaturesFiltered();
      const parts = [];
      if (a.filter === "all" || a.filter === "passive") {
        const traits = raceTraitCards();
        const dv = sheet.darkvisionEff || sheet.darkvisionBase || sheet.darkvision || 0;
        const raceCards = [];
        if (dv > 0 && (!q || ("тёмное зрение " + dv).indexOf(q) >= 0 || "темное зрение".indexOf(q) >= 0)) {
          raceCards.push(renderStaticCard("race:darkvision", "Тёмное зрение " + dv + " фт.", "race", previewSummary("В темноте ты видишь на " + dv + " фт. как при тусклом свете, а в тусклом — как при ярком. Цвета в темноте не различаешь."), "В темноте ты видишь на " + dv + " фт. как при тусклом свете, а в тусклом — как при ярком. Цвета в темноте не различаешь.", "", sheet.race || "Раса"));
        }
        traits.forEach(function (t) {
          if (q && (t.name_ru + " " + t.summary_ru).toLowerCase().indexOf(q) < 0) return;
          raceCards.push(renderStaticCard("race:" + t.id, t.name_ru, "race", previewSummary(t.summary_ru), t.summary_ru, "", sheet.race || "Раса"));
        });
        if (raceCards.length) parts.push('<div class="feat-group"><div class="feat-group__title">' + esc(sheet.race || "Раса") + ' <span class="feat-group__count">· ' + raceCards.length + "</span></div>" + raceCards.join("") + "</div>");
        const bg = backgroundFeature();
        if (bg && (!q || (bg.nameRu + " " + bg.summaryRu).toLowerCase().indexOf(q) >= 0)) {
          parts.push('<div class="feat-group"><div class="feat-group__title">' + esc(bg.bgName) + ' <span class="feat-group__count">· 1</span></div>' + renderStaticCard("bg:" + bg.id, bg.nameRu, "background", previewSummary(bg.summaryRu), bg.summaryRu, "", bg.bgName) + "</div>");
        }
      }
      const bySource = { class: [], subclass: [], feat: [], custom: [] };
      features.forEach(function (f) { (bySource[f.source] || (bySource[f.source] = [])).push(f); });
      if (bySource.class && bySource.class.length) {
        parts.push('<div class="feat-group"><div class="feat-group__title">' + esc((cls && cls.name) || "Класс") + " " + ((cls && cls.level) || "") + ' <span class="feat-group__count">· ' + bySource.class.length + "</span></div>" + bySource.class.map(renderFeatureCard).join("") + "</div>");
      }
      if (bySource.subclass && bySource.subclass.length) {
        const sub = (cls && cls.subclass) || "Архетип";
        parts.push('<div class="feat-group"><div class="feat-group__title">' + esc(sub) + ' <span class="feat-group__count">· ' + bySource.subclass.length + "</span></div>" + bySource.subclass.map(renderFeatureCard).join("") + "</div>");
      }
      Object.keys(bySource).forEach(function (src) {
        if (src === "class" || src === "subclass") return;
        if (!bySource[src] || !bySource[src].length) return;
        const title = src === "feat" ? "Черты" : (src === "custom" ? "Свои" : src);
        parts.push('<div class="feat-group"><div class="feat-group__title">' + esc(title) + ' <span class="feat-group__count">· ' + bySource[src].length + "</span></div>" + bySource[src].map(renderFeatureCard).join("") + "</div>");
      });
      if (a.filter === "all" || a.filter === "custom") {
        const customs = (a.custom || []).filter(function (row) { return !q || (row.nameRu + " " + row.summaryRu).toLowerCase().indexOf(q) >= 0; });
        if (customs.length) {
          const cards = customs.map(function (row) {
            const actions = '<div class="scene-card__actions"><button type="button" class="btn" data-abil-act="edit-custom" data-id="' + esc(row.id) + '">Править</button><button type="button" class="btn" data-abil-act="del-custom" data-id="' + esc(row.id) + '">Удалить</button></div>';
            return renderStaticCard("custom:" + row.id, row.nameRu, "custom", previewSummary(row.summaryRu), row.summaryRu, actions, "Своя");
          });
          parts.push('<div class="feat-group"><div class="feat-group__title">Свои <span class="feat-group__count">· ' + customs.length + "</span></div>" + cards.join("") + "</div>");
        }
      }
      if (!parts.length) {
        if ((a.filter && a.filter !== "all") || (a.query || "").trim()) {
          parts.push('<p class="inv-empty">Ничего не найдено по этому фильтру.</p>');
        } else {
          parts.push('<p class="inv-empty">Пока нет открытых умений. Выбери класс/уровень — или смотри заметки в Общении.</p>');
        }
      }
      return '<div class="explore features-scene">' +
        '<div class="explore-head"><div class="explore-head__tools" data-feat-toolbar>' + tools + "</div></div>" +
        '<input class="scene-search" type="search" placeholder="Избранный, стиль боя…" value="' + esc(a.query || "") + '" data-feat-search>' +
        '<div class="filters inv-filters" role="tablist" aria-label="Фильтр способностей">' + filters + "</div>" +
        '<div class="inv-list" data-feat-list>' + parts.join("") + "</div></div>";
    }
    function handleFeatClick(e) {
      const t = e.target.closest && e.target.closest("[data-feat-filter],[data-abil-toggle],[data-feat-collapse],[data-feat-expand],[data-toggle-feat-menu]");
      if (!t) return false;
      const a = ensureAbilState();
      if (t.hasAttribute("data-toggle-feat-menu")) {
        state.featMenuOpen = !state.featMenuOpen;
        if (typeof render === "function") render();
        return true;
      }
      if (t.closest && t.closest("[data-scene-menu]")) state.featMenuOpen = false;
      if (t.hasAttribute("data-feat-filter")) { a.filter = t.getAttribute("data-feat-filter"); state.featMenuOpen = false; if (typeof render === "function") render(); return true; }
      if (t.hasAttribute("data-feat-collapse")) { a.openKeys = {}; if (typeof render === "function") render(); return true; }
      if (t.hasAttribute("data-feat-expand")) {
        a.openKeys = a.openKeys || {};
        listFeaturesFiltered().forEach(function (f) { a.openKeys["feat:" + (f.id || f.name_ru)] = true; });
        raceTraitCards().forEach(function (tr) { a.openKeys["race:" + tr.id] = true; });
        a.openKeys["race:darkvision"] = true;
        const bg = backgroundFeature();
        if (bg) a.openKeys["bg:" + bg.id] = true;
        if (typeof render === "function") render();
        return true;
      }
      if (t.hasAttribute("data-abil-toggle")) {
        const key = t.getAttribute("data-abil-toggle");
        a.openKeys = a.openKeys || {};
        a.openKeys[key] = !a.openKeys[key];
        if (typeof render === "function") render();
        return true;
      }
      return false;
    }
    function handleFeatInput(e) {
      const t = e.target;
      if (!t || !t.getAttribute) return false;
      if (t.hasAttribute("data-feat-search")) {
        const a = ensureAbilState();
        a.query = t.value;
        if (typeof render === "function") render();
        const again = document.querySelector("[data-feat-search]");
        if (again && again.focus) { const pos = again.value.length; again.focus(); try { again.setSelectionRange(pos, pos); } catch (err) {} }
        return true;
      }
      return false;
    }
    function applyFeaturesForDemoChar(id) {
      if (typeof syncClassItemsFromSheet === "function") syncClassItemsFromSheet();
      else if (classItems && classItems.length !== undefined) {
        classItems.length = 0;
        (sheet.classes || []).forEach(function (c) { classItems.push(c); });
      }
      if (sheet && sheet.sorcery) {
        const ensure = (typeof ensureRules === "function") ? ensureRules : (window.SheetProto && window.SheetProto.ensureRules);
        if (typeof ensure === "function") {
          const r = ensure();
          r.sorcery = { cur: Number(sheet.sorcery.cur) || 0, max: Number(sheet.sorcery.max) || 0 };
        }
      }
      ensureAbilState();
      const a = ensureAbilState();
      a.filter = "all";
      a.query = "";
      a.openKeys = {};
      if (typeof state !== "undefined") state.featMenuOpen = false;
    }
    function setFeatures(opts) {
      opts = opts || {};
      const a = ensureAbilState();
      if (opts.filter) a.filter = opts.filter;
      if (opts.query != null) a.query = opts.query;
      if (opts.openId) {
        a.openKeys = a.openKeys || {};
        a.openKeys[opts.openId] = true;
        if (opts.openId.indexOf("feat:") !== 0 && opts.openId.indexOf("race:") !== 0 && opts.openId.indexOf("bg:") !== 0) {
          a.openKeys["feat:" + opts.openId] = true;
        }
      }
      if (opts.menu != null) state.featMenuOpen = !!opts.menu;
      if (opts.dialog) { state.scene = "features"; state.featMenuOpen = false; if (typeof openDialog === "function") openDialog(opts.dialog); return; }
      if (opts.levelUp) { state.scene = "features"; state.featMenuOpen = false; if (typeof openDialog === "function") openDialog("level-up"); return; }
      if (opts.scene) state.scene = opts.scene;
      if (typeof render === "function") render();
    }
    window.SheetFeatures = {
      renderBody: renderFeaturesBody,
      handleClick: handleFeatClick,
      handleInput: handleFeatInput,
      applyForDemoChar: applyFeaturesForDemoChar,
      setFeatures: setFeatures,
      ensure: ensureAbilState,
      live: function () { return LIVE; }
    };
    if (!window.__featListeners) {
      window.__featListeners = true;
      document.addEventListener("click", function (e) {
        if (state.featMenuOpen && !(e.target.closest && e.target.closest(".explore-head__tools"))) {
          state.featMenuOpen = false;
          if (typeof render === "function") render();
        }
        const hit = e.target.closest && e.target.closest("[data-toggle-feat-menu],[data-feat-filter],[data-feat-collapse],[data-feat-expand]");
        if (hit && window.SheetFeatures && typeof window.SheetFeatures.handleClick === "function") {
          window.SheetFeatures.handleClick(e);
        }
      });
    }
    if (typeof window.SheetLive === "undefined") window.SheetLive = LIVE;
    else {
      Object.keys(LIVE).forEach(function (k) { window.SheetLive[k] = LIVE[k]; });
    }
})();

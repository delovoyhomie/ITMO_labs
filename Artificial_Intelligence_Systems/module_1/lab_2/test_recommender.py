import unittest
from unittest.mock import patch
from recommender import parse_preferences, recommend, main


class TestDSS(unittest.TestCase):
    def test_aliases(self):
        self.assertEqual(parse_preferences('Мне нравятся: RPG, РПГ, инди'),
                         ['indie', 'role_playing_game'])

    def test_invalid_input(self):
        for value in ['', 'RPG', 'Мне нравятся:', 'Мне нравятся: гонки',
                      'Мне нравятся: RPG,', "Мне нравятся: rpg). halt."]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_preferences(value)

    def test_scenarios(self):
        scenarios = [
            ('RPG', 'solo', 'beginner', ['cyberpunk_2077', 'the_witcher_3']),
            ('инди', 'multi', 'beginner', ['stardew_valley']),
            ('головоломка', 'multi', 'any', ['portal_2']),
            ('шутер', 'solo', 'any', ['doom_eternal']),
            ('стратегия', 'any', 'any', ['civilization_vi']),
            ('RPG', 'multi', 'any', []),
            ('шутер', 'solo', 'beginner', []),
            ('RPG, инди', 'solo', 'beginner',
             ['cyberpunk_2077', 'stardew_valley', 'the_witcher_3']),
        ]
        for prefs, mode, exp, expected in scenarios:
            with self.subTest(prefs=prefs, mode=mode, exp=exp):
                rows = recommend(parse_preferences('Мне нравятся: ' + prefs), mode, exp)
                self.assertEqual([r['game'] for r in rows], expected)
                self.assertTrue(all(r['score'] == len(r['matched']) for r in rows))

    def test_api_validation(self):
        for args in [([], 'any', 'any'), (['bad'], 'any', 'any'),
                     (['indie'], 'bad', 'any'), (['indie'], 'any', 'bad')]:
            with self.subTest(args=args), self.assertRaises(ValueError):
                recommend(*args)

    def test_no_swipl(self):
        with patch('recommender.shutil.which', return_value=None):
            with self.assertRaises(RuntimeError):
                recommend(['indie'], 'any', 'any')

    def test_dialog_recovers(self):
        with patch('builtins.input', side_effect=['bad', 'Мне нравятся: инди',
                 'bad', 'вместе', 'bad', 'да']), patch('builtins.print') as out:
            self.assertEqual(main(), 0)
            self.assertTrue(any('stardew_valley' in str(c) for c in out.call_args_list))

    def test_eof(self):
        with patch('builtins.input', side_effect=EOFError), patch('builtins.print'):
            self.assertEqual(main(), 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)

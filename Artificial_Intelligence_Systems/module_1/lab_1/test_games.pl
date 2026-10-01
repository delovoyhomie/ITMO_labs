:- consult(games).
:- begin_tests(games).

test(fact) :- game(minecraft).
test(unknown, [fail]) :- game(unknown).
test(valve, set(G == [portal_2,counter_strike_2])) :- developed_by(G,valve).
test(solo_story, set(G == [the_witcher_3,cyberpunk_2077,portal_2,hades,hollow_knight,celeste,baldurs_gate_3])) :- solo_story_game(G).
test(or_and_not, set(G == [minecraft,stardew_valley])) :- game(G), (relaxing(G);free_to_play(G)), \+ competitive(G).
test(friendly, set(G == [portal_2,minecraft,stardew_valley,baldurs_gate_3])) :- friendly_multiplayer(G).
test(intense, set(G == [celeste,civilization_vi,counter_strike_2,doom_eternal,hades,hollow_knight])) :- intense_game(G).
test(indie, set(G == [hades,hollow_knight,celeste])) :- indie_gem(G).
test(beginner, set(G == [the_witcher_3,cyberpunk_2077,portal_2,minecraft,stardew_valley,baldurs_gate_3])) :- recommended_for_beginner(G).
test(relaxing, set(G == [minecraft,stardew_valley,civilization_vi])) :- relaxing_solo_game(G).
test(studio_pairs) :- findall(G-S,studio_game(G,S),Pairs), length(Pairs,10).
test(cut_loses_answers, [fail]) :- story_driven(G), !, \+ developed_by(G,cd_projekt_red).
test(without_cut, set(G == [portal_2,hades,hollow_knight,celeste,baldurs_gate_3])) :- story_driven(G), \+ developed_by(G,cd_projekt_red).

:- end_tests(games).

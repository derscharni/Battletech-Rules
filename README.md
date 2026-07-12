# BattleTech LoS-Trainer

Interaktives Lernwerkzeug für die Line-of-Sight- und To-Hit-Regeln des BattleTech-Tabletops. Eine einzige HTML-Datei, läuft offline im Browser — gebaut, um die LoS-Regeln nicht nur zu berechnen, sondern Hex für Hex zu **begründen**.

## Nutzung

`battletech-los-trainer.html` im Browser öffnen. Kein Server, keine Installation. (Nur der 3D-Modus lädt three.js per CDN und braucht dafür einmalig Internet.)

## Features

- **LoS-Sandbox**: Karteneditor (Höhen, Wälder, Wasser, Gebäude, Rough), Mechs per Drag platzieren, liegend/stehend umschaltbar. Jede Sichtlinie wird im Diagnose-Panel Hex für Hex erklärt — mit Regelzitat und Seitenangabe.
- **Höhenprofil**: Querschnitt entlang der Sichtlinie zeigt, *warum* eine Linie frei oder blockiert ist.
- **GATOR-Rechner**: Gunnery, Bewegung beider Seiten, Hitze, Waffe (mit Minimum Range) — Terrain und Distanz kommen automatisch aus der LoS. Ergebnis: Target Number und Trefferwahrscheinlichkeit.
- **16 Lektionen** in drei Gruppen (Grundlagen, Fortgeschritten, GATOR), inklusive der klassischen Regel-Irrtümer: Zielhex-Wald blockiert nicht, bergab negiert Partial Cover, liegende Mechs verschwinden hinter Level-1-Kanten, der Verteidiger wählt bei geteilter Linie.
- **Regelbuch-Switcher**: BattleMech Manual, Total Warfare, Alpha Strike: Commander's Edition (Hex-Umrechnung).
- **Zwei Darstellungen**: „Klar" (2D-isometrisch mit Level-Beschriftung) und „3D" (WebGL-Diorama mit drehbarer Kamera, Schatten und detaillierten Mechs).
- **Gefechtssimulation**: Laser, PPC, Autokanone, LRM als animierte Schüsse — blockierte Linien schlagen sichtbar im Hindernis ein.
- **Foto-Vorlage**: Foto eines echten Mapsheets als halbtransparente Ebene unterlegen und abmalen.

## Regelbasis

Seitengenau geprüft am *BattleTech: BattleMech Manual* (Catalyst Game Labs, Produkt 35010; PDF-Stand 2020, Errata v1.1.1): LoS S. 22–23, Partial Cover & Terrain-Modifikatoren S. 26, GATOR S. 26–28, Wasser/Unterwasser S. 23/65. Der Blocking-Algorithmus ist zusätzlich gegen die MegaMek-Referenzimplementierung (`LosEffects.java`) verifiziert.

## Entwicklung

- `los-engine.js` — die Regel-Engine als eigenständiges Modul (identisch mit der in der HTML eingebetteten Version)
- `los-tests.js` — Testsuite: `node los-tests.js` (25 Tests)

## Rechtliches

Inoffizielles Fan-Lernwerkzeug. BattleTech, BattleMech und alle zugehörigen Marken sind Eigentum von The Topps Company, Inc. / Catalyst Game Labs. Dieses Projekt enthält keine Regelbuchtexte, nur Paraphrasen mit Quellenverweis.

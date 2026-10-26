# Landing page rebuild: what changed

## New
- `src/components/SignRotator.tsx`: rotating yard-sign hero (10 posters in `public/signs/`, data in `src/lib/signs.ts`).
- `src/lib/features.ts`: every feature, written once. The landing sections and `/features` pages read from it.
- `/features` and `/features/[slug]` (write-quotes, send-and-track, get-paid, know-your-numbers, built-for-south-africa).
- `src/components/FeatureBands.tsx`: one landing section per feature group, plus tenders.
- `src/components/PhotoStrip.tsx` and `public/photos/`: real photo slots. Nothing shows until you add photos (see `public/photos/README.md`).
- `public/og.png`: new share image.

## Rewritten without the template look
Hero, old-way section (was the "roast"), workflow, screens, chatbot comparison, pricing, plan cards, FAQ, closing, header, footer, page shell, tenders page, login side panel.

## Removed
- The four AI generated photos in `public/images/`.
- Blurred colour blobs, gradient overlays, tracked all caps labels, 01/02 markers on non-sequences, the fake "quote opened" notification, arrows in buttons.
- `RoastSection`, `ProductStorySection`, `MoreFeaturesSection` (content moved to `features.ts`).

## Still to do
- Add real photos to `public/photos/credits.json`.
- `public/yebo-dashboard-art.png` is still used on the in-app dashboard (`DashboardView.tsx`). Check whether it is AI art and replace it if so.
- `TenderDemo.tsx` still has the old rounded card style.
- Legal pages still use a tracked caps label (`LegalPage.tsx`).

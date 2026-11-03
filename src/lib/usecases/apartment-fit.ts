import type { UseCase } from "./types";

const CRITERIA = `My criteria:
- Must: total rent at most €1,400 a month including utilities
- Must: a dog is allowed (I have a medium-sized dog)
- Must: at least 2 bedrooms (one becomes my office)
- Must: under 35 minutes to the city centre by public transport
- Nice to have: balcony, elevator, quiet street`;

const listing = (text: string) => `${CRITERIA}\n\nListing:\n${text}`;

export const apartmentFit: UseCase = {
  id: "apartment-fit",
  title: "Apartment fit",
  audience: "everyone",
  blurb: "Score a listing against your own must-haves and nice-to-haves, and catch the dealbreaker in the small print.",
  questions: {
    fit: {
      type: "score",
      instructions: "How well does this listing fit my criteria overall?",
      criteria: ["Poor fit", "Weak fit", "Acceptable", "Good fit", "Excellent fit"],
    },
    dealbreaker: {
      type: "noul",
      instructions: "Does this listing break any of my must-have requirements?",
    },
  },
  items: [
    { id: "tram-balcony", text: listing("2 bedrooms, €1,250/month all-in. Pets welcome. 20 min by tram to the centre. South-facing balcony, elevator, quiet residential street."), labels: { fit: "4", dealbreaker: "no" } },
    { id: "utilities-extra", text: listing("2 bedrooms, €1,350/month plus about €150 utilities. Dogs OK. 25 min to the centre by metro. Balcony."), labels: { fit: "1", dealbreaker: "yes" } },
    { id: "no-pets", text: listing("3 bedrooms, €1,380/month all-in. Strictly no pets. 15 min to the centre. Elevator, balcony."), labels: { fit: "0", dealbreaker: "yes" } },
    { id: "one-bed-big-living", text: listing("1 bedroom with a very large living room (could fit a desk). €1,100 all-in. Dogs allowed. 30 min to the centre."), labels: { fit: "1", dealbreaker: "yes" } },
    { id: "far-commute", text: listing("2 bedrooms, €1,390 all-in. Dogs allowed. 40 min to the centre by bus and tram. Quiet street, elevator."), labels: { fit: "1", dealbreaker: "yes" } },
    { id: "main-road-stairs", text: listing("2 bedrooms, €1,200 all-in. Dogs OK. 30 min to the centre. On a busy main road, 4th floor without an elevator."), labels: { fit: "2", dealbreaker: "no" } },
    { id: "cheap-perfect", text: listing("2 bedrooms, €1,000 all-in. Dog-friendly building with a park next door. 10 min to the centre. Balcony, elevator, quiet side street."), labels: { fit: "4", dealbreaker: "no" } },
    { id: "budget-edge", text: listing("2 bedrooms, €1,400 all-in. Dogs allowed with an extra €300 deposit. 33 min to the centre. Elevator, no balcony."), labels: { fit: "3", dealbreaker: "no" } },
    { id: "studio", text: listing("Bright studio, €800 all-in. Pets allowed. 12 min to the centre. Balcony."), labels: { fit: "0", dealbreaker: "yes" } },
    { id: "pets-negotiable", text: listing("2 bedrooms, €1,300 all-in. Pets negotiable with landlord. 25 min to the centre. Quiet courtyard flat."), labels: { fit: "2", dealbreaker: "no" } },
    { id: "cheap-far", text: listing("2 bedrooms, €950 plus around €200 utilities. Dogs welcome. 50 min to the centre by bus. Big garden."), labels: { fit: "1", dealbreaker: "yes" } },
    { id: "metro-ground-floor", text: listing("2 bedrooms, €1,350 all-in. Dogs OK. 18 min by metro. Ground floor with a small terrace, quiet street."), labels: { fit: "4", dealbreaker: "no" } },
    { id: "solid-no-balcony", text: listing("2 bedrooms, €1,290 all-in. Dogs allowed. 28 min to the centre. Elevator, no balcony, some street noise."), labels: { fit: "3", dealbreaker: "no" } },
    { id: "cats-only", text: listing("2 bedrooms, €1,250 all-in. Cats allowed, no dogs. 20 min to the centre. Balcony, elevator."), labels: { fit: "0", dealbreaker: "yes" } },
    { id: "shared-flat", text: listing("You rent 2 private rooms in a 4-bedroom shared flat (shared kitchen and bathroom). €1,200 all-in. Dogs OK. 20 min to the centre."), labels: { fit: "2", dealbreaker: "no" } },
    { id: "top-floor-walkup", text: listing("2 bedrooms, €1,380 all-in. Dogs allowed. 34 min to the centre. Top floor, no elevator, balcony with a view, very quiet."), labels: { fit: "3", dealbreaker: "no" } },
  ],
};

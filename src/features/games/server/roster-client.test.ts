import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRosters } from "./roster-client";

describe("fetchRosters", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubRosters(body: unknown) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
    );
  }

  it("maps players with name/position/captain/line, goalies first then skaters by jersey", async () => {
    stubRosters({
      HomeTeamGameRoster: {
        Players: [
          { LastName: "LEINO", FirstName: "Lauri", RoleAbbrv: "VP", Captain: "", JerseyNr: "77", Line: 1 },
          { LastName: "NIEMI", FirstName: "Mika", RoleAbbrv: "KH", Captain: "A", JerseyNr: "31", Line: 3 },
          { LastName: "JUUTI", FirstName: "Joose", RoleAbbrv: "MV", Captain: "C", JerseyNr: "1", Line: 1 },
        ],
      },
      AwayTeamGameRoster: { Players: [] },
    });

    const rosters = await fetchRosters(2710919, 2027);

    // Goalie sorts to the front regardless of jersey; the two skaters are on different
    // lines (1 before 3), so line order wins over jersey order here too.
    expect(rosters.home.map((p) => p.jersey)).toEqual(["1", "77", "31"]);
    expect(rosters.home[0]).toEqual({ jersey: "1", name: "JUUTI Joose", position: "MV", captain: "C", line: 1 });
    expect(rosters.home[1].captain).toBeNull();
    expect(rosters.home[2].captain).toBe("A");
    expect(rosters.away).toEqual([]);
  });

  it("orders same-line skaters as left wing, center, right wing, left defence, right defence", async () => {
    stubRosters({
      HomeTeamGameRoster: {
        Players: [
          { LastName: "A", FirstName: "OP", RoleAbbrv: "OP", Captain: "", JerseyNr: "5", Line: 1 },
          { LastName: "B", FirstName: "VP", RoleAbbrv: "VP", Captain: "", JerseyNr: "4", Line: 1 },
          { LastName: "C", FirstName: "OL", RoleAbbrv: "OL", Captain: "", JerseyNr: "3", Line: 1 },
          { LastName: "D", FirstName: "KH", RoleAbbrv: "KH", Captain: "", JerseyNr: "2", Line: 1 },
          { LastName: "E", FirstName: "VL", RoleAbbrv: "VL", Captain: "", JerseyNr: "1", Line: 1 },
        ],
      },
      AwayTeamGameRoster: { Players: [] },
    });

    const rosters = await fetchRosters(1, 2027);

    expect(rosters.home.map((p) => p.position)).toEqual(["VL", "KH", "OL", "VP", "OP"]);
  });

  it("sorts an unrecognized position code after the five regular spots on the same line", async () => {
    stubRosters({
      HomeTeamGameRoster: {
        Players: [
          { LastName: "A", FirstName: "Extra", RoleAbbrv: "13. H", Captain: "", JerseyNr: "99", Line: 1 },
          { LastName: "B", FirstName: "Wing", RoleAbbrv: "VL", Captain: "", JerseyNr: "1", Line: 1 },
        ],
      },
      AwayTeamGameRoster: { Players: [] },
    });

    const rosters = await fetchRosters(1, 2027);
    expect(rosters.home.map((p) => p.position)).toEqual(["VL", "13. H"]);
  });

  it("sorts multiple goalies by their own line (starter before backup), then jersey", async () => {
    stubRosters({
      HomeTeamGameRoster: {
        Players: [
          { LastName: "Backup", FirstName: "", RoleAbbrv: "MV", Captain: "", JerseyNr: "19", Line: 2 },
          { LastName: "Starter", FirstName: "", RoleAbbrv: "MV", Captain: "", JerseyNr: "1", Line: 1 },
        ],
      },
      AwayTeamGameRoster: { Players: [] },
    });

    const rosters = await fetchRosters(1, 2027);
    expect(rosters.home.map((p) => p.name)).toEqual(["Starter ", "Backup "]);
  });

  it("treats a non-C/A Captain value as null", async () => {
    stubRosters({
      HomeTeamGameRoster: {
        Players: [{ LastName: "X", FirstName: "Y", RoleAbbrv: "H", Captain: "", JerseyNr: "9", Line: 1 }],
      },
      AwayTeamGameRoster: { Players: [] },
    });

    const rosters = await fetchRosters(1, 2027);
    expect(rosters.home[0].captain).toBeNull();
  });

  it("throws when the upstream response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );

    await expect(fetchRosters(1, 2027)).rejects.toThrow();
  });
});

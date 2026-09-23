import { validateEmail } from '../src/validateEmail';

describe('validateEmail', () => {
  it('rejects non-string and nullish inputs', () => {
    expect(validateEmail(null as unknown as string)).toBe(false);
    expect(validateEmail(undefined as unknown as string)).toBe(false);
    expect(validateEmail(12345 as unknown as string)).toBe(false);
    expect(validateEmail({} as unknown as string)).toBe(false);
    expect(validateEmail([] as unknown as string)).toBe(false);
  });

  it('rejects a whitespace-only string', () => {
    expect(validateEmail('   ')).toBe(false);
  });

  it('accepts a valid email padded with surrounding whitespace', () => {
    expect(validateEmail('  user@example.com  ')).toBe(true);
  });

  it('accepts a total address of exactly 254 characters', () => {
    const local = 'a'.repeat(64);
    const domain = `${'a'.repeat(63)}.${'a'.repeat(63)}.${'a'.repeat(57)}.com`;
    const email = `${local}@${domain}`;
    expect(email.length).toBe(254);
    expect(validateEmail(email)).toBe(true);
  });

  it('rejects a total address of exactly 255 characters', () => {
    const local = 'a'.repeat(64);
    const domain = `${'a'.repeat(63)}.${'a'.repeat(63)}.${'a'.repeat(58)}.com`;
    const email = `${local}@${domain}`;
    expect(email.length).toBe(255);
    expect(validateEmail(email)).toBe(false);
  });

  it('rejects addresses with no @, multiple @s, an empty side, or internal whitespace', () => {
    expect(validateEmail('userexample.com')).toBe(false);
    expect(validateEmail('user@@example.com')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('us er@example.com')).toBe(false);
  });

  it('accepts a local part of exactly 64 characters', () => {
    expect(validateEmail(`${'a'.repeat(64)}@example.com`)).toBe(true);
  });

  it('rejects a local part of 65 characters', () => {
    expect(validateEmail(`${'a'.repeat(65)}@example.com`)).toBe(false);
  });

  it('accepts a domain at the maximum length actually reachable (252 chars, given the 254-char total limit)', () => {
    const domain = `${'a'.repeat(63)}.${'a'.repeat(63)}.${'a'.repeat(63)}.${'a'.repeat(56)}.com`;
    expect(domain.length).toBe(252);
    expect(validateEmail(`u@${domain}`)).toBe(true);
  });

  it('accepts a local part using the full allowed character set', () => {
    expect(validateEmail("john!#$%&'*+/=?^_{|}~-doe@example.com")).toBe(true);
    expect(validateEmail('john.doe@example.com')).toBe(true);
  });

  it('rejects a local part containing disallowed characters', () => {
    expect(validateEmail('john,doe@example.com')).toBe(false);
    expect(validateEmail('john(doe)@example.com')).toBe(false);
    expect(validateEmail('john[doe]@example.com')).toBe(false);
    expect(validateEmail('"john"@example.com')).toBe(false);
    expect(validateEmail('jöhn@example.com')).toBe(false);
  });

  it('rejects a local part with a leading dot, trailing dot, or consecutive dots', () => {
    expect(validateEmail('.john@example.com')).toBe(false);
    expect(validateEmail('john.@example.com')).toBe(false);
    expect(validateEmail('john..doe@example.com')).toBe(false);
  });

  it('accepts valid domain structures (multi-level subdomain, digits and hyphens in a label)', () => {
    expect(validateEmail('user@mail.corp.example.com')).toBe(true);
    expect(validateEmail('user@my-domain123.com')).toBe(true);
  });

  it('rejects invalid domain structures', () => {
    expect(validateEmail('user@localhost')).toBe(false);
    expect(validateEmail('user@.example.com')).toBe(false);
    expect(validateEmail('user@example.com.')).toBe(false);
    expect(validateEmail('user@example..com')).toBe(false);
    expect(validateEmail('user@-example.com')).toBe(false);
    expect(validateEmail('user@example-.com')).toBe(false);
    expect(validateEmail('user@exa_mple.com')).toBe(false);
    expect(validateEmail('user@example!.com')).toBe(false);
    expect(validateEmail('user@[192.168.1.1]')).toBe(false);
    expect(validateEmail('user@exämple.com')).toBe(false);
  });

  it('accepts a domain label of exactly 63 characters', () => {
    expect(validateEmail(`user@${'a'.repeat(63)}.com`)).toBe(true);
  });

  it('rejects a domain label of 64 characters', () => {
    expect(validateEmail(`user@${'a'.repeat(64)}.com`)).toBe(false);
  });

  it('accepts common non-.com TLDs', () => {
    expect(validateEmail('user@example.org')).toBe(true);
    expect(validateEmail('user@example.io')).toBe(true);
    expect(validateEmail('user@example.co.uk')).toBe(true);
    expect(validateEmail('user@example.dev')).toBe(true);
  });

  it('rejects a TLD that is too short, numeric, or contains invalid characters', () => {
    expect(validateEmail('user@example.c')).toBe(false);
    expect(validateEmail('user@example.123')).toBe(false);
    expect(validateEmail('user@example.c0m')).toBe(false);
  });

  it('accepts .com in any letter case', () => {
    expect(validateEmail('user@example.COM')).toBe(true);
    expect(validateEmail('user@example.Com')).toBe(true);
  });

  it('accepts a domain whose penultimate label duplicates the TLD (e.g. com.com)', () => {
    expect(validateEmail('user@com.com')).toBe(true);
    expect(validateEmail('user@sub.com.com')).toBe(true);
  });
});

/**
 * REALISTIC_EMAILS
 *
 * ~300 email addresses in the styles that ordinary people actually use day to
 * day: firstname.lastname, initials, birth-year suffixes, underscores,
 * hyphens, plus-tags (e.g. gmail "+newsletter" filters), and a mix of the
 * most common consumer providers (Gmail, Yahoo, Outlook, Hotmail, iCloud,
 * AOL, ProtonMail, Zoho, Yandex, GMX, Fastmail, regional providers like
 * Rediffmail, and country-specific TLD variants like yahoo.co.uk), plus a
 * handful of corporate/work-style addresses on made-up company domains.
 *
 * These were generated from common naming patterns rather than written to
 * target validateEmail's specific rules, so they exercise the function
 * against the kind of input it will actually see in production.
 */
const REALISTIC_EMAILS: string[] = [
    "d.thompson@rediffmail.com",
    "juan18@fastmail.com",
    "justin-patel@yandex.com",
    "tylerflores19@gmx.com",
    "ava1996@yahoo.co.uk",
    "adam68@gmx.com",
    "amina1992@hey.com",
    "daniel1991@hotmail.com",
    "priya.meyer@yahoo.com",
    "sergeiy@gmail.com",
    "emily.s@hotmail.co.uk",
    "olga.martinez69@protonmail.com",
    "stephencampbell20@zoho.com",
    "nsuzuki@yahoo.co.uk",
    "nathan.lopez951@mail.com",
    "priya.iyer428@icloud.com",
    "nicole.scott+newsletter@aol.com",
    "chris.robinson.30@outlook.com",
    "javier_liu@yahoo.co.uk",
    "viktorhuang22@yahoo.co.in",
    "isabellareddy@icloud.com",
    "laurenwright@live.com",
    "rachel.lee@mail.com",
    "carlos25@gmx.com",
    "priya.thomas+newsletter@fastmail.com",
    "amandaclark@yahoo.com",
    "mmeyer@outlook.co.uk",
    "pavel.smith.43@zoho.com",
    "matthew.m@hey.com",
    "kenjicarter68@yandex.com",
    "kayla.patel565@yahoo.co.uk",
    "ava2001@zoho.com",
    "li_campbell@hotmail.com",
    "olga14@mail.com",
    "scott.zhang@gmail.com",
    "carlos.n@icloud.com",
    "fgarcia@yahoo.co.uk",
    "liam-baker@yahoo.com",
    "wei.lee.13@aol.com",
    "a.thompson@yahoo.co.uk",
    "samantha.flores531@hey.com",
    "lauren.martinez809@mail.com",
    "melissa.park@hotmail.co.uk",
    "dmitrit@yahoo.com",
    "alexismehta69@gmx.com",
    "nicolepark@protonmail.com",
    "a.huang@hey.com",
    "amber14@aol.com",
    "m.rivera@yahoo.com",
    "michael.lee@yahoo.com",
    "a.mehta@rediffmail.com",
    "kevinrobinson@icloud.com",
    "pooja1993@mail.com",
    "logan-campbell@hotmail.com",
    "joseph1986@yahoo.com",
    "laura.gonzalez+newsletter@fastmail.com",
    "o.muller@aol.com",
    "ava.thomas@gmail.com",
    "sakura11@gmx.com",
    "chen_gupta@aol.com",
    "chris-sanchez@yandex.com",
    "maria.i@outlook.co.uk",
    "scott_johnson@aol.com",
    "nicole_meyer@live.com",
    "yasmin.miller@rediffmail.com",
    "joseph2010@hotmail.co.uk",
    "nshah@icloud.com",
    "a.garcia@gmx.com",
    "brandon_meyer@yandex.com",
    "stephanie.adams853@yahoo.com",
    "rohanthompson12@hey.com",
    "stephen.singh@yahoo.co.uk",
    "ivan.liu477@zoho.com",
    "danielmoore54@aol.com",
    "l.sharma@outlook.com",
    "kavyafischer87@msn.com",
    "adam_choi@yahoo.co.in",
    "zainab.wright@fastmail.com",
    "j.park@icloud.com",
    "nicole.weber+newsletter@msn.com",
    "ananyajones62@zoho.com",
    "maria.huang.34@yahoo.co.uk",
    "ahmed-liu@mail.com",
    "kevin.g@gmail.com",
    "ashley-campbell@fastmail.com",
    "vliu@live.com",
    "noah63@yahoo.co.in",
    "vikrampark@outlook.com",
    "pooja.anderson.12@msn.com",
    "samantha-miller@gmx.com",
    "james_allen@gmail.com",
    "mmiller@live.com",
    "yuki.choi.49@aol.com",
    "stephanie30@outlook.co.uk",
    "pooja_johnson@rediffmail.com",
    "hannah.torres+newsletter@hotmail.com",
    "tylerhernandez94@live.com",
    "daniel1985@hotmail.co.uk",
    "jonathans@hey.com",
    "nathan.harris979@live.com",
    "pavel.green.35@gmail.com",
    "vallen@msn.com",
    "lauren1981@hey.com",
    "emoore@yahoo.com",
    "ameyer@gmx.com",
    "raj2008@yahoo.com",
    "brandon.r@yahoo.com",
    "scott.carter617@hotmail.co.uk",
    "yasmin.r@zoho.com",
    "li.scott.32@gmx.com",
    "weiperez@yahoo.co.uk",
    "melissa.sanchez835@rediffmail.com",
    "logan.huang@outlook.co.uk",
    "mason.ramirez+newsletter@aol.com",
    "hassan2007@zoho.com",
    "amina.allen.47@yahoo.com",
    "b.iyer@hey.com",
    "victoria.jackson.36@icloud.com",
    "maria.j@zoho.com",
    "arjun.brown@mail.com",
    "f.garcia@outlook.co.uk",
    "amanda.patel@mail.com",
    "jennifer-iyer@hey.com",
    "elizabethlee@gmx.com",
    "elizabeth.m@zoho.com",
    "ashley2002@outlook.com",
    "nehaliu@outlook.co.uk",
    "carlosadams22@msn.com",
    "elena_sanchez@yahoo.com",
    "sofia.jung+newsletter@yahoo.com",
    "jonathan.nelson745@rediffmail.com",
    "li_scott@yandex.com",
    "liam1996@zoho.com",
    "v.miller@gmx.com",
    "katarina.yamamoto325@outlook.com",
    "raj_roberts@yahoo.com",
    "luis.nair440@hey.com",
    "p.watanabe@hotmail.co.uk",
    "melissa.p@icloud.com",
    "maria.lewis.3@msn.com",
    "nathanw@hotmail.co.uk",
    "yasminnelson21@fastmail.com",
    "heather_scott@hey.com",
    "liam1994@mail.com",
    "layla1990@gmx.com",
    "li.muller+newsletter@protonmail.com",
    "k.watanabe@yahoo.com",
    "yuki.muller40@outlook.com",
    "elena15@live.com",
    "aaronhall@outlook.com",
    "laura.wright@zoho.com",
    "adamm@hey.com",
    "fatima.g@hotmail.co.uk",
    "alexis.f@outlook.com",
    "dmitrih@outlook.com",
    "michael_nguyen@outlook.co.uk",
    "h.hernandez@zoho.com",
    "juan1982@yandex.com",
    "arjun_kim@fastmail.com",
    "heatherchen81@live.com",
    "justin_sanchez@icloud.com",
    "mzhang@gmail.com",
    "justin1988@fastmail.com",
    "megan.torres@rediffmail.com",
    "mason14@outlook.co.uk",
    "carlos_nair@outlook.com",
    "daniellew@outlook.com",
    "dnair@msn.com",
    "ericn@msn.com",
    "david.park@live.com",
    "loganh@mail.com",
    "emma.johnson358@hotmail.com",
    "kavyas@yandex.com",
    "arjun34@zoho.com",
    "hiroshi2005@protonmail.com",
    "sophia_clark@gmx.com",
    "cyang@live.com",
    "aaron.reddy+newsletter@protonmail.com",
    "javierl@gmail.com",
    "stephen_sanchez@outlook.co.uk",
    "arjun.green.37@rediffmail.com",
    "danielle.shah@hey.com",
    "javier58@fastmail.com",
    "priya1990@mail.com",
    "liam31@fastmail.com",
    "elizabethchen13@zoho.com",
    "daniellelopez@aol.com",
    "danielreddy88@outlook.com",
    "carlos.davis@protonmail.com",
    "dmitri.m@live.com",
    "kenji56@outlook.co.uk",
    "viktor1980@mail.com",
    "j.lee@rediffmail.com",
    "raj.miller.26@hotmail.com",
    "emoore@outlook.co.uk",
    "poojab@yandex.com",
    "nathan_walker@yahoo.co.uk",
    "mason.weber431@rediffmail.com",
    "ryan-watanabe@gmx.com",
    "dmitri56@hey.com",
    "ivan-brown@aol.com",
    "mei-king@protonmail.com",
    "khalidhuang74@rediffmail.com",
    "elena.jones.24@yahoo.com",
    "liam_allen@zoho.com",
    "lzhang@yahoo.com",
    "yan.martinez704@zoho.com",
    "raja@hotmail.com",
    "jessica.jung+newsletter@live.com",
    "yasmin.thompson.17@protonmail.com",
    "kenji_sharma@gmx.com",
    "melissa-watanabe@fastmail.com",
    "viktor-jones@aol.com",
    "weimeyer@msn.com",
    "chris1982@gmail.com",
    "laurarobinson9@yandex.com",
    "yasmin_moore@gmail.com",
    "sophia.liu+newsletter@hey.com",
    "layla21@live.com",
    "jasonwang@hey.com",
    "kimberly.baker.8@yahoo.co.uk",
    "olgawilliams@msn.com",
    "daniel.j@yahoo.co.uk",
    "kimberlydavis@yahoo.co.uk",
    "i.johnson@icloud.com",
    "jason-young@outlook.co.uk",
    "victoria-lee@msn.com",
    "anastasia_wright@yahoo.co.uk",
    "stephanie.c@gmx.com",
    "kimberlymartin@fastmail.com",
    "jason.w@yahoo.com",
    "andrew-king@zoho.com",
    "nathanallen69@msn.com",
    "sophiag@msn.com",
    "sofia.perez+newsletter@zoho.com",
    "brian_johnson@gmail.com",
    "ivan.huang.40@yahoo.co.uk",
    "sarah.yang.41@yahoo.co.in",
    "heatherthomas@outlook.com",
    "logan-patel@gmx.com",
    "itaylor@icloud.com",
    "amber-sanchez@gmx.com",
    "olivia.h@aol.com",
    "noahiyer@hotmail.com",
    "megantaylor91@protonmail.com",
    "priya.young.30@protonmail.com",
    "athomas@gmx.com",
    "viktor25@outlook.co.uk",
    "cadams@fastmail.com",
    "liamzhang@msn.com",
    "ashley-king@outlook.com",
    "callen@rediffmail.com",
    "nathan.c@hotmail.com",
    "li2009@mail.com",
    "xin.nelson@hotmail.co.uk",
    "m.miller@zoho.com",
    "yukiwatanabe6@aol.com",
    "ivan1996@outlook.com",
    "diegoramirez@gmx.com",
    "samanthaw@protonmail.com",
    "scott-clark@zoho.com",
    "jasonmehta@yahoo.com",
    "viktor_davis@gmx.com",
    "camila.williams@msn.com",
    "aminarobinson@yandex.com",
    "amber.scott@msn.com",
    "m.williams@hey.com",
    "daniel-huang@gmail.com",
    "sakura.rivera@mail.com",
    "victoria.g@gmx.com",
    "elizabeth30@yahoo.co.uk",
    "ashley.liu96@gmx.com",
    "yasmin.yang557@hey.com",
    "rliu@hey.com",
    "ali_ramirez@fastmail.com",
    "luis.nelson313@zoho.com",
    "kayla-young@msn.com",
    "jonathan.gupta.28@mail.com",
    "olivia-hall@hotmail.co.uk",
    "jonathan_green@rediffmail.com",
    "brittany.park@piedpiper.com",
    "amber_lim@wayne.com",
    "elena_huang@nlp-labs.io",
    "acampbell@nlp-labs.io",
    "david_campbell@statecollege.edu",
    "pooja_martin@cityhospital.org",
    "young.s@soylent.com",
    "ytanaka@datawiz.ai",
    "natasha_liu@cloudnine.dev",
    "melissa.baker@soylent.com",
    "hlewis@biz-solutions.com",
    "yamamoto.i@cityhospital.org",
    "dchoi@wayne.com",
    "brandon.kim@piedpiper.com",
    "chen_chen@acme.com",
    "sakura.reddy@cyberdyne.com",
    "yuki_chen@statecollege.edu",
    "torres.s@soylent.com",
    "manderson@cyberdyne.com",
    "ivan.thomas@stark.com",];

describe('validateEmail - real-world email corpus', () => {
  it('has no duplicate entries in the corpus', () => {
    const unique = new Set(REALISTIC_EMAILS);
    expect(unique.size).toBe(REALISTIC_EMAILS.length);
  });

  it('contains between 200 and 300 sample emails', () => {
    expect(REALISTIC_EMAILS.length).toBeGreaterThanOrEqual(200);
    expect(REALISTIC_EMAILS.length).toBeLessThanOrEqual(300);
  });

  describe.each(REALISTIC_EMAILS)('%s', (email) => {
    it('is accepted by validateEmail', () => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  it('reports a pass rate summary across the whole corpus', () => {
    const failures = REALISTIC_EMAILS.filter((email) => !validateEmail(email));
    const passRate = (
      ((REALISTIC_EMAILS.length - failures.length) / REALISTIC_EMAILS.length) *
      100
    ).toFixed(1);

    // eslint-disable-next-line no-console
    console.log(
      `validateEmail pass rate on realistic corpus: ${passRate}% ` +
        `(${REALISTIC_EMAILS.length - failures.length}/${REALISTIC_EMAILS.length})`
    );
    if (failures.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Rejected real-world emails:', failures);
    }

    expect(failures).toEqual([]);
  });
});

/**
 * DIFFICULT_EMAILS
 *
 * Trickier but still real-world-plausible addresses, covering cases the
 * REALISTIC_EMAILS corpus above doesn't exercise much:
 *  - Deep / multi-level subdomains (3-6 labels), the kind seen on internal
 *    company tools, cloud infra, and CI systems (e.g. build.jenkins.internal.
 *    tools.example.dev)
 *  - Multi-part country-code TLDs (.co.uk, .com.au, .co.jp, .ac.uk, .gov.in, ...)
 *  - Long/unusual but valid TLDs (.technology, .museum, .international, ...)
 *  - Local parts pushed hard against the allowed special-character set
 *    (apostrophes, plus/tilde/caret/equals/braces/pipes/backticks, etc.)
 *  - Local parts near the 64-character limit and with many (non-consecutive)
 *    dots
 *  - Mixed-case domains and hyphenated multi-level labels
 */
const DIFFICULT_EMAILS: string[] = [

    "user@mail.corp.us.example.com",
    "admin@eu-west.prod.internal.acme.com",
    "student@cs.grad.ucla.edu",
    "alice@dev.staging.api.example.co.uk",
    "bob@a.b.c.d.example.com",
    "noreply@notifications.eu.central.aws.example.com",
    "support@help.desk.tickets.zendesk.com",
    "j.smith@mail.google.com",
    "team@engineering.platform.internal.stripe.com",
    "info@www.example.com",
    "contact@shop.us.east.retailer.co.uk",
    "webmaster@static.assets.cdn.example.net",
    "billing@accounts.payments.finance.example.io",
    "ci@build.jenkins.internal.tools.example.dev",
    "root@db01.cluster.prod.datacenter.example.org",
    "no-reply@auth.login.sso.corp.example.com",
    "hr@people.ops.global.example.com",
    "alerts@monitoring.grafana.infra.example.com",
    "sales@apac.region.global.example.com",
    "dev@sandbox.test.qa.staging.example.com",
    "user@example.com.au",
    "user@example.co.jp",
    "user@example.or.kr",
    "user@example.ac.uk",
    "user@example.gov.in",
    "user@example.edu.au",
    "user@example.net.in",
    "user@example.org.uk",
    "user@example.com.br",
    "user@example.co.za",
    "info@example.technology",
    "team@example.international",
    "contact@example.photography",
    "hello@example.museum",
    "travel@example.travel",
    "biz@example.enterprises",
    "j.o.h.n.d.o.e@example.com",
    "a!b#c$d%e&f*g@example.com",
    "user'name@example.com",
    "user+tag+subtag+another@example.com",
    "x_y-z.w+v'u!t#s$r@example.com",
    "'quoted-ish'@example.com",
    "user~name@example.com",
    "user^name@example.com",
    "user=name@example.com",
    "user?name@example.com",
    "user{name}@example.com",
    "user|name@example.com",
    "user`name@example.com",
    "1234567890@example.com",
    "user123456789012345678901234567890123456789012345678901234@example.com",
    "a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a.a@example.com",
    "User.Name@Example.COM",
    "USER@SUB.EXAMPLE.COM",
    "user@my-sub-domain.another-sub.example-site.com",
    "user@x-1.y-2.z-3.example.com",
    "a@b.co",
    "a.b@c.d.co",
    "very.long.local.part.with.many.dots.but.no.consecutive.ones@example.com",];

describe('validateEmail - multi-level subdomains and difficult formats', () => {
  it('has no duplicate entries in the corpus', () => {
    const unique = new Set(DIFFICULT_EMAILS);
    expect(unique.size).toBe(DIFFICULT_EMAILS.length);
  });

  describe.each(DIFFICULT_EMAILS)('%s', (email) => {
    it('is accepted by validateEmail', () => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  it('reports a pass rate summary across the difficult corpus', () => {
    const failures = DIFFICULT_EMAILS.filter((email) => !validateEmail(email));
    const passRate = (
      ((DIFFICULT_EMAILS.length - failures.length) / DIFFICULT_EMAILS.length) *
      100
    ).toFixed(1);

    // eslint-disable-next-line no-console
    console.log(
      `validateEmail pass rate on difficult corpus: ${passRate}% ` +
        `(${DIFFICULT_EMAILS.length - failures.length}/${DIFFICULT_EMAILS.length})`
    );
    if (failures.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Rejected difficult emails:', failures);
    }

    expect(failures).toEqual([]);
  });
});
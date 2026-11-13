// The SEO audit's markup fixes: a tap-to-call phone on inner pages, and one H1 on pages that had none.
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import InnerFooter from '@/site/components/inner/InnerFooter'
import ContactInfo from '@/site/components/contact/ContactInfo'
import ContactHeader from '@/site/components/contact/ContactHeader'
import PlansHeader from '@/site/components/cleaning-services/PlansHeader'
import { siteData } from '@/site/data/site'
import { contactData } from '@/site/data/contact'
import { getCity } from '@/server/content/store'

const c = await getCity('minneapolis')
const tel = `<a href="${c.phoneHref}">${c.phone}</a>`

describe('inner pages: the phone is a tap-to-call link', () => {
  it('in the inner footer', () => {
    const { site, innerSite } = siteData(c)
    expect(renderToStaticMarkup(<InnerFooter site={site} innerSite={innerSite} />)).toContain(tel)
  })

  it('in the contact page info column', () => {
    expect(renderToStaticMarkup(<ContactInfo contactInfo={contactData(c).contactInfo} />)).toContain(tel)
  })
})

describe('pages that had no H1 get one', () => {
  it('/cleaning-services', () => {
    expect(renderToStaticMarkup(<PlansHeader />)).toMatch(/<h1[^>]*>Choose a cleaning package<\/h1>/)
  })

  it('/contact: the banner heading only, not the form one', () => {
    const { contactHeader } = contactData(c)
    expect(renderToStaticMarkup(<ContactHeader variant="banner" contactHeader={contactHeader} />)).toMatch(
      /<h1[^>]*>Contact Us<\/h1>/,
    )
    expect(renderToStaticMarkup(<ContactHeader variant="form" contactHeader={contactHeader} />)).not.toContain('<h1')
  })
})

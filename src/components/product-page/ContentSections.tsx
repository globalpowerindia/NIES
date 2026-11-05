import { RichText } from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'

import type { ContentSection } from '@/lib/storefront/product-page'

import { Panel } from './Panel'
import { Reveal } from './Reveal'

type RichTextData = Parameters<typeof RichText>[0]['data']

/** The anchor for a section, for the jump links. */
export const contentSectionId = (index: number) => `details-${index + 1}`

const Body = ({ section }: { section: ContentSection }) => {
  switch (section.kind) {
    case 'table':
      return (
        <dl className="grid overflow-hidden rounded-xl border-[0.5px] border-dark-100 lg:grid-cols-2">
          {section.rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[45%_1fr] border-b-[0.5px] border-dark-100 text-body3 lg:text-h6 lg:odd:border-r-[0.5px]"
            >
              <dt className="bg-light-500 px-3 py-2.5 text-dark-400">{row.label}</dt>
              <dd className="px-3 py-2.5 font-medium break-words text-dark-500">{row.value}</dd>
            </div>
          ))}
        </dl>
      )
    case 'items':
      return (
        <ul className="grid gap-x-8 lg:grid-cols-2">
          {section.items.map((item) => (
            <li
              key={item.name}
              className="flex items-center gap-3 border-b-[0.5px] border-dark-100 py-2.5 text-body3 lg:text-h6"
            >
              {item.image && (
                <a
                  href={item.image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View a photo of ${item.name}`}
                  className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-light-100 lg:size-20"
                >
                  <Image src={item.image.url} alt="" fill sizes="160px" className="object-contain" />
                </a>
              )}
              <span className="min-w-0 flex-1 font-medium text-dark-500">{item.name}</span>
              {item.quantity && <span className="shrink-0 text-dark-400">{item.quantity}</span>}
            </li>
          ))}
        </ul>
      )
    case 'features':
      return (
        <ul className="grid list-disc gap-x-8 gap-y-2 pl-5 text-body3 font-medium text-dark-500 marker:text-brand-red-500 sm:grid-cols-2 lg:text-h6">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    case 'text':
      return (
        <RichText
          data={section.body as RichTextData}
          className="flex max-w-[60rem] flex-col gap-3 text-body3 text-dark-400 lg:text-h6 lg:leading-relaxed [&_a]:text-brand-blue-400 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-dark-500 [&_ul]:list-disc [&_ul]:pl-5"
        />
      )
    case 'cards':
      return (
        <>
          {section.intro && <p className="text-body3 text-dark-400 lg:text-h6">{section.intro}</p>}
          <ul className="grid gap-3 lg:grid-cols-3">
            {section.cards.map((card) => (
              <li key={card.title} className="flex flex-col gap-2 rounded-xl bg-light-300 p-4">
                {card.image && (
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-light-100">
                    <Image
                      src={card.image.url}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 400px"
                      className="object-contain"
                    />
                  </span>
                )}
                <span className="text-body2 font-semibold text-dark-500 lg:text-h5">{card.title}</span>
                {card.text && <span className="text-body3 text-dark-400 lg:text-h6">{card.text}</span>}
              </li>
            ))}
          </ul>
        </>
      )
  }
}

/** Whatever sections staff added to a product, in their order, each in its own layout. */
export const ContentSections = ({ sections }: { sections: ContentSection[] }) =>
  sections.map((section, index) => (
    <Reveal key={section.id}>
      <Panel id={contentSectionId(index)} title={section.heading}>
        <Body section={section} />
      </Panel>
    </Reveal>
  ))

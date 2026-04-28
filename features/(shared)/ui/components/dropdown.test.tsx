import { describe, expect, test } from 'bun:test'
import { renderToString } from 'preact-render-to-string'
import { Dropdown, DropdownItem, DropdownSeparator } from './dropdown'

describe('Dropdown', () => {
  test('renders details/summary pattern', () => {
    const html = renderToString(
      <Dropdown id="test-dd" trigger={<span>Open</span>}>
        <DropdownItem>Item 1</DropdownItem>
      </Dropdown>,
    )
    expect(html).toContain('<details')
    expect(html).toContain('<summary')
    expect(html).toContain('Open')
    expect(html).toContain('Item 1')
  })

  test('renders with right alignment', () => {
    const html = renderToString(
      <Dropdown id="test-dd" trigger={<span>Open</span>} align="right">
        <DropdownItem>Item</DropdownItem>
      </Dropdown>,
    )
    expect(html).toContain('right-0')
  })

  test('renders with left alignment by default', () => {
    const html = renderToString(
      <Dropdown id="test-dd" trigger={<span>Open</span>}>
        <DropdownItem>Item</DropdownItem>
      </Dropdown>,
    )
    expect(html).toContain('left-0')
  })
})

describe('DropdownItem', () => {
  test('renders as link when href provided', () => {
    const html = renderToString(<DropdownItem href="/settings">Settings</DropdownItem>)
    expect(html).toContain('<a')
    expect(html).toContain('href="/settings"')
    expect(html).toContain('Settings')
  })

  test('renders as button when no href', () => {
    const html = renderToString(<DropdownItem>Click me</DropdownItem>)
    expect(html).toContain('<button')
    expect(html).toContain('Click me')
  })

  test('renders danger style', () => {
    const html = renderToString(<DropdownItem danger>Delete</DropdownItem>)
    expect(html).toContain('text-error')
  })
})

describe('DropdownSeparator', () => {
  test('renders hr', () => {
    const html = renderToString(<DropdownSeparator />)
    expect(html).toContain('<hr')
    expect(html).toContain('border-linen')
  })
})

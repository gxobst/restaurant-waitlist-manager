import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SkeletonLoader from './SkeletonLoader'

describe('SkeletonLoader', () => {
  it('renders the default number of lines', () => {
    render(<SkeletonLoader />)
    const lines = document.querySelectorAll('.animate-pulse')
    expect(lines).toHaveLength(3)
  })

  it('renders the specified number of lines', () => {
    render(<SkeletonLoader lines={5} />)
    const lines = document.querySelectorAll('.animate-pulse')
    expect(lines).toHaveLength(5)
  })

  it('applies custom className', () => {
    render(<SkeletonLoader className="custom-class" />)
    const container = screen.getByTestId('skeleton-loader')
    expect(container).toHaveClass('custom-class')
  })

  it('has shimmer animation class', () => {
    render(<SkeletonLoader />)
    const lines = document.querySelectorAll('.animate-pulse')
    lines.forEach((line) => {
      expect(line).toHaveClass('animate-pulse')
    })
  })
})
